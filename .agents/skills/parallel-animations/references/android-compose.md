# Android Jetpack Compose Implementation Guide for Parallel Animations

This reference covers implementing ColorOS/OriginOS-style parallel animations and interruptible gesture transitions within native Android using **Jetpack Compose**.

---

## 1. Why Standard Compose APIs Fall Short of True Parallel Animation

Standard Compose high-level APIs like `AnimatedVisibility`, `Crossfade`, or naive `animate*AsState` are designed for discrete state transitions:
1. When state changes from $A \to B \to C$ in rapid succession, default transitions may reset velocity or cancel child coroutines abruptly.
2. Standard recomposition cycles run on the UI thread and can introduce a 1–2 frame delay between pointer event dispatch and frame render.
3. Multi-surface transitions (e.g., dismissing App A while launching App B) require distinct coroutine scopes managed concurrently rather than a shared transition block.

---

## 2. Low-Level `Animatable` with Spring Velocity Handoff

In Jetpack Compose, the foundational primitive for continuous physics is `Animatable<T, V>`. Crucially, `Animatable.animateTo` takes an `initialVelocity` parameter:

```kotlin
import androidx.compose.animation.core.*
import androidx.compose.ui.geometry.Offset
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

class ParallelSpringTransition(
    private val scope: CoroutineScope,
    // ColorOS Aurora Preset: Stiffness 380f, DampingRatio 0.98f
    private val springSpec: SpringSpec<Float> = SpringSpec(
        dampingRatio = 0.98f,
        stiffness = 380f,
        visibilityThreshold = 0.25f
    )
) {
    val progress = Animatable(0f)

    /**
     * Interruption-safe retargeting.
     * Retains the instantaneous velocity of the running animation.
     */
    fun retarget(targetValue: Float) {
        scope.launch {
            // Retrieve current velocity at the exact moment of interruption
            val currentVelocity = progress.velocity
            progress.animateTo(
                targetValue = targetValue,
                animationSpec = springSpec,
                initialVelocity = currentVelocity
            )
        }
    }
}
```

---

## 3. High-Performance Gesture Interception (`pointerInput`)

To ensure zero-lag touch tracking and seamless velocity handoff when the finger lifts:

```kotlin
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.offset
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.util.VelocityTracker
import androidx.compose.ui.unit.IntOffset
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

@Composable
fun InterruptibleParallelSurface(
    modifier: Modifier = Modifier,
    onDismissed: () -> Unit,
    content: @Composable () -> Unit
) {
    val coroutineScope = rememberCoroutineScope()
    val offsetY = remember { Animatable(0f) }
    val scale = remember { Animatable(1f) }
    val velocityTracker = remember { VelocityTracker() }

    Box(
        modifier = modifier
            // Direct GPU layer mutation avoids recomposition overhead
            .graphicsLayer {
                translationY = offsetY.value
                scaleX = scale.value
                scaleY = scale.value
                shadowElevation = 16f
                clip = true
            }
            .pointerInput(Unit) {
                detectDragGestures(
                    onDragStart = {
                        velocityTracker.resetTracking()
                    },
                    onDrag = { change, dragAmount ->
                        change.consume()
                        velocityTracker.addPosition(change.uptimeMillis, change.position)
                        
                        coroutineScope.launch {
                            // Direct snap during active finger drag
                            offsetY.snapTo(offsetY.value + dragAmount.y)
                            val dragRatio = (offsetY.value / 1000f).coerceIn(0f, 0.4f)
                            scale.snapTo(1f - dragRatio * 0.3f)
                        }
                    },
                    onDragEnd = {
                        val velocityY = velocityTracker.calculateVelocity().y
                        coroutineScope.launch {
                            val shouldDismiss = offsetY.value > 250f || velocityY > 1200f
                            if (shouldDismiss) {
                                // Fling downwards to dismiss, passing current gesture velocity
                                offsetY.animateTo(
                                    targetValue = 1800f,
                                    animationSpec = spring(
                                        dampingRatio = Spring.DampingRatioLowBouncy,
                                        stiffness = Spring.StiffnessMediumLow
                                    ),
                                    initialVelocity = velocityY
                                )
                                onDismissed()
                            } else {
                                // Snap back to resting position with preserved velocity
                                launch {
                                    offsetY.animateTo(
                                        targetValue = 0f,
                                        animationSpec = spring(
                                            dampingRatio = 0.95f,
                                            stiffness = 380f
                                        ),
                                        initialVelocity = velocityY
                                    )
                                }
                                launch {
                                    scale.animateTo(1f, spring(0.95f, 380f))
                                }
                            }
                        }
                    }
                )
            }
    ) {
        content()
    }
}
```

---

## 4. Multi-App Parallel Task Orchestration

In launcher or multi-window contexts:

```kotlin
data class AppTransitionTask(
    val appId: String,
    val bounds: Animatable<Float, AnimationVector1D>,
    val alpha: Animatable<Float, AnimationVector1D>,
    var isForeground: Boolean
)

class ParallelWindowCompositor(private val scope: CoroutineScope) {
    private val activeTasks = mutableStateMapOf<String, AppTransitionTask>()

    fun launchApp(appId: String) {
        val existing = activeTasks[appId]
        if (existing != null) {
            // Already running! Seamlessly retarget towards 1.0f (fullscreen)
            scope.launch {
                existing.bounds.animateTo(1f, spring(0.98f, 380f), existing.bounds.velocity)
            }
            return
        }

        val task = AppTransitionTask(
            appId = appId,
            bounds = Animatable(0f),
            alpha = Animatable(0f),
            isForeground = true
        )
        activeTasks[appId] = task

        scope.launch {
            // Launch in parallel with any other existing dismissing tasks
            task.bounds.animateTo(1f, spring(0.98f, 380f))
        }
        scope.launch {
            task.alpha.animateTo(1f, tween(150))
        }
    }

    fun dismissApp(appId: String) {
        val task = activeTasks[appId] ?: return
        task.isForeground = false
        scope.launch {
            task.bounds.animateTo(0f, spring(0.98f, 380f), task.bounds.velocity)
            activeTasks.remove(appId)
        }
    }
}
```

---

## 5. RenderThread & SurfaceControl Optimization Tips

1. **Avoid Layout Recomputations**: Mutate visual attributes exclusively through `Modifier.graphicsLayer` blocks. Modifying `Modifier.offset(x, y)` directly triggers layout re-measurement every frame.
2. **Hardware Layer Promotion**: Set `renderEffect = BlurEffect(...)` on Android 12+ (API 31+) using `RenderEffect` instead of software blur shaders.
3. **Choreographer Synchronization**: Ensure all spring loops feed into `withFrameNanos { ... }` or Compose's built-in animation clock to align perfectly with the display's VSYNC pulses.
