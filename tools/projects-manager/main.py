#!/usr/bin/env python3
import os
import sys
import json
import time
import threading
import concurrent.futures
import webbrowser
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from pathlib import Path

# ─────────────────────────────────────────────────────────────────────────────
# Dependency availability probe
# ─────────────────────────────────────────────────────────────────────────────

try:
    import google.genai  # noqa: F401
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────

APP_NAME = "projects-manager"


def get_settings_path() -> Path:
    """Return a platform-appropriate path for settings.json.

    - Windows : %APPDATA%\\projects-manager\\settings.json
    - macOS   : ~/Library/Application Support/projects-manager/settings.json
    - Linux   : $XDG_CONFIG_HOME/projects-manager/settings.json
                (falls back to ~/.config/projects-manager/settings.json)
    """
    if sys.platform == "win32":
        base = Path(os.environ.get("APPDATA", Path.home() / "AppData" / "Roaming"))
    elif sys.platform == "darwin":
        base = Path.home() / "Library" / "Application Support"
    else:
        # XDG Base Directory spec (Linux and other POSIX)
        xdg = os.environ.get("XDG_CONFIG_HOME", "")
        base = Path(xdg) if xdg else Path.home() / ".config"
    return base / APP_NAME / "settings.json"


SETTINGS_FILE = get_settings_path()
DEFAULT_PROJECT_FILE = (
    Path(__file__).resolve().parent.parent.parent / "assets" / "data" / "projects.json"
)
GEMINI_API_STUDIO_URL = "https://aistudio.google.com/apikey"
GEMINI_MODEL = "gemma-3-4b-it"  # default model
GEMINI_MODELS = [
    "gemma-3-4b-it",
    "gemma-3-12b-it",
    "gemma-3-27b-it",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
]
SUGGEST_COOLDOWN_SECS = 180   # 3-minute global cooldown after a successful call
SUGGEST_API_TIMEOUT_SECS = 180  # abort the API call itself after 3 minutes

# ─────────────────────────────────────────────────────────────────────────────
# Extensible project form fields
# Each entry supports:
#   id          – key in JSON data
#   label       – display label
#   placeholder – hint text shown when empty
#   required    – whether the field must be non-empty on save
#   type        – "text" | "url"  (drives validation)
#   has_choose  – show a "Choose" button beside the entry
# ─────────────────────────────────────────────────────────────────────────────

FIELDS = [
    {
        "id": "name",
        "label": "Name:",
        "placeholder": "e.g. My Awesome Project",
        "required": True,
        "type": "text",
        "has_choose": False,
    },
    {
        "id": "description",
        "label": "Description:",
        "placeholder": "e.g. A simple tool to manage tasks.",
        "required": True,
        "type": "text",
        "has_choose": False,
    },
    {
        "id": "url",
        "label": "URL:",
        "placeholder": "e.g. https://github.com/theonlyasdk/project",
        "required": True,
        "type": "url",
        "has_choose": False,
    },
    {
        "id": "demo_url",
        "label": "Demo URL:",
        "placeholder": "e.g. https://theonlyasdk.github.io/project",
        "required": False,
        "type": "url",
        "has_choose": False,
    },
    {
        "id": "tags",
        "label": "Tags:",
        "placeholder": "e.g. utility, web, tool",
        "required": True,
        "type": "text",
        "has_choose": False,
    },
]

# ─────────────────────────────────────────────────────────────────────────────
# Settings helpers
# ─────────────────────────────────────────────────────────────────────────────

def load_settings() -> dict:
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "gemini": {"enabled": False, "api_key": ""},
        "projects": {"file_path": str(DEFAULT_PROJECT_FILE)},
    }


def save_settings(settings: dict):
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(settings, f, indent=2)


# ─────────────────────────────────────────────────────────────────────────────
# Gemini helper
# ─────────────────────────────────────────────────────────────────────────────

def gemini_suggest_tags(api_key: str, field_values: dict, model: str) -> str:
    """
    Calls the model and returns a comma-separated tag string.
    Raises concurrent.futures.TimeoutError if it takes longer than
    SUGGEST_API_TIMEOUT_SECS seconds.
    """
    from google import genai  # lazy import

    def _call():
        client = genai.Client(api_key=api_key)
        context_lines = "\n".join(
            f"  {fid}: {val}" for fid, val in field_values.items() if val
        )
        prompt = (
            "You are a tagging assistant for a software project gallery catalogue.\n"
            "Given the following project details, suggest a short comma-separated list "
            "of lowercase kebab-case tags (no spaces, max 8 tags). "
            "The tags describe the project itself (e.g. technology used, category, purpose). "
            "Do NOT include the author's username or any variation of it "
            "(e.g. 'theonlyasdk', 'asdk', 'ASDK') — tags are for the project, not the author. "
            "Reply with ONLY the comma-separated tags – no explanation, no punctuation other than commas.\n\n"
            f"Project details:\n{context_lines}"
        )
        response = client.models.generate_content(model=model, contents=prompt)
        raw = response.text.strip()
        return ", ".join(t.strip().strip('"').strip("'") for t in raw.split(",") if t.strip())

    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(_call)
        return future.result(timeout=SUGGEST_API_TIMEOUT_SECS)


# ─────────────────────────────────────────────────────────────────────────────
# Tooltip helper
# ─────────────────────────────────────────────────────────────────────────────

class Tooltip:
    """Simple hover tooltip for any tkinter widget."""

    def __init__(self, widget: tk.Widget, text: str):
        self.widget = widget
        self.text = text
        self._tip: tk.Toplevel | None = None
        widget.bind("<Enter>", self._show)
        widget.bind("<Leave>", self._hide)
        widget.bind("<Destroy>", self._hide)

    def _show(self, event=None):
        if self._tip:
            return
        x = self.widget.winfo_rootx() + 20
        y = self.widget.winfo_rooty() + self.widget.winfo_height() + 4
        self._tip = tk.Toplevel(self.widget)
        self._tip.wm_overrideredirect(True)
        self._tip.wm_geometry(f"+{x}+{y}")
        tk.Label(
            self._tip, text=self.text,
            background="#ffffe0", relief=tk.SOLID, borderwidth=1,
            font=("TkDefaultFont", 9), padx=6, pady=3,
        ).pack()

    def _hide(self, event=None):
        if self._tip:
            self._tip.destroy()
            self._tip = None


# ─────────────────────────────────────────────────────────────────────────────
# Utility – centre a Toplevel over its parent root
# ─────────────────────────────────────────────────────────────────────────────

def centre_over_parent(dialog: tk.Toplevel, parent_root: tk.Tk):
    dialog.update_idletasks()
    pw = parent_root.winfo_width()
    ph = parent_root.winfo_height()
    px = parent_root.winfo_x()
    py = parent_root.winfo_y()
    dw = dialog.winfo_reqwidth()
    dh = dialog.winfo_reqheight()
    x = px + (pw - dw) // 2
    y = py + (ph - dh) // 2
    dialog.geometry(f"+{x}+{y}")


# ─────────────────────────────────────────────────────────────────────────────
# Resizable error dialog (for long error messages)
# ─────────────────────────────────────────────────────────────────────────────

class ErrorDialog(tk.Toplevel):
    """A resizable dialog with a scrollable text area for long error messages."""

    def __init__(self, parent_window: tk.BaseWidget, title: str, message: str):
        super().__init__(parent_window)
        self.title(title)
        self.geometry("540x280")
        self.minsize(360, 180)
        self.resizable(True, True)
        self._build(message)
        self.update_idletasks()
        # Centre over whatever window spawned this
        pw = parent_window.winfo_width()
        ph = parent_window.winfo_height()
        px = parent_window.winfo_rootx()
        py = parent_window.winfo_rooty()
        x = px + (pw - self.winfo_reqwidth()) // 2
        y = py + (ph - self.winfo_reqheight()) // 2
        self.geometry(f"+{x}+{y}")
        self.transient(parent_window)
        self.grab_set()
        self.wait_window()

    def _build(self, message: str):
        frame = ttk.Frame(self, padding=10)
        frame.pack(fill=tk.BOTH, expand=True)
        frame.rowconfigure(0, weight=1)
        frame.columnconfigure(0, weight=1)

        text = tk.Text(frame, wrap=tk.WORD, relief=tk.FLAT, highlightthickness=1,
                       highlightbackground="#cccccc", state=tk.NORMAL)
        text.insert(tk.END, message)
        text.config(state=tk.DISABLED)   # read-only
        text.grid(row=0, column=0, sticky=tk.NSEW)

        vsb = ttk.Scrollbar(frame, orient="vertical", command=text.yview)
        text.configure(yscrollcommand=vsb.set)
        vsb.grid(row=0, column=1, sticky=tk.NS)

        ttk.Button(self, text="OK", command=self.destroy, width=10).pack(pady=(0, 10))


# ─────────────────────────────────────────────────────────────────────────────
# Delete confirmation dialog
# ─────────────────────────────────────────────────────────────────────────────

class DeleteConfirmDialog(tk.Toplevel):
    """
    A polished confirmation dialog that lists the projects about to be deleted
    and returns True if the user confirmed, False otherwise.
    """

    ICON = "⚠️"   # warning emoji serves as a cross-platform icon

    def __init__(self, parent_root: tk.Tk, project_names: list[str]):
        super().__init__(parent_root)
        self.confirmed = False
        n = len(project_names)
        self.title("Confirm Deletion")
        self.resizable(False, False)
        self._build(n, project_names)
        self.update_idletasks()
        x = parent_root.winfo_x() + (parent_root.winfo_width()  - self.winfo_reqwidth())  // 2
        y = parent_root.winfo_y() + (parent_root.winfo_height() - self.winfo_reqheight()) // 2
        self.geometry(f"+{x}+{y}")
        self.transient(parent_root)
        self.grab_set()
        self.wait_window()

    def _build(self, n: int, names: list[str]):
        outer = ttk.Frame(self, padding=20)
        outer.pack(fill=tk.BOTH, expand=True)

        # Icon + heading row
        head = ttk.Frame(outer)
        head.pack(fill=tk.X, pady=(0, 12))
        tk.Label(head, text=self.ICON, font=("TkDefaultFont", 28)).pack(side=tk.LEFT, padx=(0, 12))
        label_text = (
            f"Delete {n} project{'s' if n != 1 else ''}?"
        )
        tk.Label(
            head, text=label_text,
            font=("TkDefaultFont", 14, "bold"),
            anchor=tk.W, justify=tk.LEFT,
        ).pack(side=tk.LEFT, fill=tk.X, expand=True)

        # Scrollable list of candidates
        list_frame = ttk.Frame(outer)
        list_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 14))
        listbox = tk.Listbox(
            list_frame, height=min(len(names), 8),
            relief=tk.FLAT, highlightthickness=1,
            highlightbackground="#cccccc",
            selectmode=tk.NONE, activestyle="none",
        )
        for name in names:
            listbox.insert(tk.END, f"  •  {name}")
        vsb = ttk.Scrollbar(list_frame, orient="vertical", command=listbox.yview)
        listbox.configure(yscrollcommand=vsb.set)
        vsb.pack(side=tk.RIGHT, fill=tk.Y)
        listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        tk.Label(
            outer,
            text="This action cannot be undone.",
            foreground="#cc3333",
            font=("TkDefaultFont", 9),
        ).pack(anchor=tk.W, pady=(0, 14))

        # Buttons
        btn_row = ttk.Frame(outer)
        btn_row.pack(fill=tk.X)
        ttk.Button(btn_row, text="Cancel", command=self.destroy).pack(side=tk.RIGHT)
        ttk.Button(
            btn_row, text="🗑  Delete",
            command=self._confirm,
        ).pack(side=tk.RIGHT, padx=(0, 8))

    def _confirm(self):
        self.confirmed = True
        self.destroy()


# ─────────────────────────────────────────────────────────────────────────────
# Placeholder-aware Entry widget
# ─────────────────────────────────────────────────────────────────────────────

class PlaceholderEntry(ttk.Entry):
    def __init__(self, master=None, placeholder="", default_value="", show_char="", *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.placeholder = placeholder
        self.is_placeholder_active = False
        self._show_char = show_char

        self.bind("<FocusIn>", self._foc_in)
        self.bind("<FocusOut>", self._foc_out)

        if default_value:
            self.insert(0, default_value)
            self.configure(foreground="black")
            if show_char:
                self.configure(show=show_char)
        else:
            self._put_placeholder()

    def _put_placeholder(self):
        self.config(show="")
        self.delete(0, tk.END)
        self.insert(0, self.placeholder)
        self.configure(foreground="gray")
        self.is_placeholder_active = True

    def _foc_in(self, *_):
        if self.is_placeholder_active:
            self.delete(0, tk.END)
            self.configure(foreground="black")
            if self._show_char:
                self.configure(show=self._show_char)
            self.is_placeholder_active = False

    def _foc_out(self, *_):
        if not self.get():
            self._put_placeholder()

    def get_real_value(self) -> str:
        return "" if self.is_placeholder_active else self.get()

    def set_value(self, value: str):
        """Replace contents with a real value (clears placeholder state)."""
        self.config(show=self._show_char if self._show_char else "")
        self.delete(0, tk.END)
        self.insert(0, value)
        self.configure(foreground="black")
        self.is_placeholder_active = False


# ─────────────────────────────────────────────────────────────────────────────
# Settings window
# ─────────────────────────────────────────────────────────────────────────────

class SettingsWindow(tk.Toplevel):
    def __init__(self, parent: "ProjectManagerApp"):
        super().__init__(parent.root)
        self.parent = parent
        # Shallow copy so Cancel discards changes
        self.settings = {k: dict(v) for k, v in parent.settings.items()}

        self.title("Settings")
        self.resizable(True, False)
        self.minsize(480, 1)
        self._build()
        self.geometry("520x300")
        centre_over_parent(self, parent.root)
        self.transient(parent.root)
        self.grab_set()

    def _build(self):
        notebook = ttk.Notebook(self)
        notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=(10, 0))

        # ── Gemini tab ────────────────────────────────────────────────────────
        g = ttk.Frame(notebook, padding=10)
        notebook.add(g, text="  Gemini  ")
        g.columnconfigure(1, weight=1)

        ttk.Label(g, text="API Key:").grid(row=0, column=0, sticky=tk.W, pady=8)
        self.api_key_entry = PlaceholderEntry(
            g,
            placeholder="Paste your Gemini API key here",
            default_value=self.settings.get("gemini", {}).get("api_key", ""),
            show_char="•",
        )
        self.api_key_entry.grid(row=0, column=1, sticky=tk.EW, pady=8, padx=5)
        self.api_key_entry.bind("<KeyRelease>", lambda _: self._update_gemini_controls())

        self.get_key_btn = ttk.Button(
            g,
            text="Get API Key from Google AI Studio ↗",
            command=lambda: webbrowser.open(GEMINI_API_STUDIO_URL),
        )
        self.get_key_btn.grid(row=1, column=0, columnspan=2, sticky=tk.W, pady=4)

        # Model selector – hidden when no API key
        ttk.Label(g, text="Model:").grid(row=2, column=0, sticky=tk.W, pady=8)
        saved_model = self.settings.get("gemini", {}).get("model", GEMINI_MODEL)
        self._model_var = tk.StringVar(value=saved_model if saved_model in GEMINI_MODELS else GEMINI_MODEL)
        self.model_combo = ttk.Combobox(
            g, textvariable=self._model_var,
            values=GEMINI_MODELS, state="readonly",
        )
        self.model_combo.grid(row=2, column=1, sticky=tk.EW, pady=8, padx=5)

        self._update_gemini_controls()

        # ── Projects tab ──────────────────────────────────────────────────────
        p = ttk.Frame(notebook, padding=10)
        notebook.add(p, text="  Projects  ")
        p.columnconfigure(1, weight=1)

        ttk.Label(p, text="Projects File:").grid(row=0, column=0, sticky=tk.W, pady=8)
        self.proj_path_entry = PlaceholderEntry(
            p,
            placeholder=str(DEFAULT_PROJECT_FILE),
            default_value=self.settings.get("projects", {}).get("file_path", ""),
        )
        self.proj_path_entry.grid(row=0, column=1, sticky=tk.EW, pady=8, padx=5)
        ttk.Button(p, text="Browse…", command=self._browse_proj).grid(row=0, column=2, padx=5)
        ttk.Label(
            p,
            text="Leave blank to use the default path relative to this script.",
            foreground="gray",
        ).grid(row=1, column=0, columnspan=3, sticky=tk.W, pady=(0, 4))

        # ── OK / Cancel ───────────────────────────────────────────────────────
        btn_row = ttk.Frame(self)
        btn_row.pack(fill=tk.X, padx=10, pady=10)
        ttk.Button(btn_row, text="Cancel", command=self.destroy).pack(side=tk.RIGHT)
        ttk.Button(btn_row, text="OK", command=self._apply).pack(side=tk.RIGHT, padx=6)

    def _update_gemini_controls(self):
        has_key = bool(self.api_key_entry.get_real_value().strip())
        # "Get key" button: visible only when no key
        if has_key:
            self.get_key_btn.grid_remove()
        else:
            self.get_key_btn.grid()
        # Model selector: visible only when a key is present
        if has_key:
            self.model_combo.grid()
        else:
            self.model_combo.grid_remove()
            # Also hide the Model label (row 2 col 0) dynamically
        # Grab the label widget by grid info and show/hide it
        for child in self.model_combo.master.winfo_children():
            info = child.grid_info()
            if info.get("row") == "2" and info.get("column") == "0":
                if has_key:
                    child.grid()
                else:
                    child.grid_remove()
                break

    def _browse_proj(self):
        path = filedialog.askopenfilename(
            filetypes=[("JSON Files", "*.json")],
            initialfile=self.proj_path_entry.get_real_value() or str(DEFAULT_PROJECT_FILE),
        )
        if path:
            self.proj_path_entry.set_value(path)

    def _apply(self):
        api_key = self.api_key_entry.get_real_value().strip()
        proj_path = self.proj_path_entry.get_real_value().strip()
        new_settings = {
            "gemini": {
                "enabled": bool(api_key),
                "api_key": api_key,
                "model": self._model_var.get(),
            },
            "projects": {"file_path": proj_path or str(DEFAULT_PROJECT_FILE)},
        }
        try:
            save_settings(new_settings)
            self.parent.settings = new_settings
            self.parent.apply_settings()
            self.destroy()
        except Exception as exc:
            messagebox.showerror("Error", f"Failed to save settings:\n{exc}", parent=self)


# ─────────────────────────────────────────────────────────────────────────────
# Project add / edit dialog  (single reusable class)
# ─────────────────────────────────────────────────────────────────────────────

class ProjectDialog(tk.Toplevel):
    def __init__(self, parent: "ProjectManagerApp", edit_index=None, edit_data=None):
        super().__init__(parent.root)
        self.parent = parent
        self.edit_index = edit_index
        self.edit_data = edit_data or {}

        is_edit = edit_index is not None
        self.title("Edit Project" if is_edit else "New Project")

        h = 90 + len(FIELDS) * 42
        self.geometry(f"560x{h}")
        self.resizable(True, False)   # horizontal only
        self.minsize(480, h)

        self.entries: dict[str, PlaceholderEntry] = {}
        self._suggest_btn: ttk.Button | None = None
        self._build()

        centre_over_parent(self, parent.root)
        self.transient(parent.root)
        self.grab_set()

    # ── widget construction ───────────────────────────────────────────────────

    def _build(self):
        frame = ttk.Frame(self, padding=12)
        frame.pack(fill=tk.BOTH, expand=True)
        frame.columnconfigure(1, weight=1)
        frame.columnconfigure(2, weight=0)

        tags_row = next(i for i, f in enumerate(FIELDS) if f["id"] == "tags")
        has_gemini = bool(self.parent.settings.get("gemini", {}).get("api_key", ""))

        for idx, field in enumerate(FIELDS):
            ttk.Label(frame, text=field["label"]).grid(
                row=idx, column=0, sticky=tk.W, pady=5, padx=(0, 4)
            )

            entry = PlaceholderEntry(
                frame,
                placeholder=field["placeholder"],
                default_value=self.edit_data.get(field["id"], ""),
            )
            self.entries[field["id"]] = entry

            # Determine column span: leave col 2 free if has_choose OR tags+gemini
            needs_btn_col = field.get("has_choose") or (idx == tags_row and has_gemini)
            span = 1 if needs_btn_col else 2
            entry.grid(row=idx, column=1, columnspan=span, sticky=tk.EW, pady=5, padx=5)

            # Bind every required non-tags field to re-evaluate the Suggest button
            if has_gemini and field["id"] != "tags" and field["required"]:
                entry.bind("<KeyRelease>", lambda _: self._update_suggest_btn())
                entry.bind("<FocusOut>",   lambda _: self._update_suggest_btn())

            if field.get("has_choose"):
                ttk.Button(
                    frame,
                    text="Choose",
                    command=lambda f=field: self._dummy_choose(f["label"]),
                ).grid(row=idx, column=2, padx=(0, 4))

            if idx == tags_row and has_gemini:
                self._suggest_btn = ttk.Button(
                    frame, text="✨ Suggest", command=self._suggest_tags,
                    state="disabled",   # enabled by _update_suggest_btn
                )
                self._suggest_btn.grid(row=idx, column=2, padx=(0, 4))
                # Tooltip showing the active model
                active_model = self.parent.settings.get("gemini", {}).get("model", GEMINI_MODEL)
                Tooltip(self._suggest_btn, f"Suggest tags using {active_model}")
                # If a cooldown from a previous dialog is still running, show it
                if time.monotonic() < self.parent.suggest_cooldown_until:
                    self.after(100, self._tick_cooldown)
                else:
                    # Initial state check (in case edit_data pre-fills all fields)
                    self.after(50, self._update_suggest_btn)

        btn_text = "Update Project" if self.edit_index is not None else "Save Project"
        ttk.Button(frame, text=btn_text, command=self._save).grid(
            row=len(FIELDS), column=0, columnspan=3, pady=14
        )

    def _update_suggest_btn(self):
        """Enable Suggest only when all required non-tags fields have real values and no cooldown."""
        if not self._suggest_btn or not self._suggest_btn.winfo_exists():
            return
        # Don't disturb a running cooldown ticker
        if time.monotonic() < self.parent.suggest_cooldown_until:
            return
        required_filled = all(
            self.entries[f["id"]].get_real_value().strip()
            for f in FIELDS
            if f["required"] and f["id"] != "tags"
        )
        self._suggest_btn.config(state="normal" if required_filled else "disabled")

    # ── Gemini tag suggestion ─────────────────────────────────────────────────

    def _suggest_tags(self):
        api_key = self.parent.settings.get("gemini", {}).get("api_key", "")
        if not api_key:
            messagebox.showwarning(
                "No API Key",
                "Please add a Gemini API key in Settings → Gemini.",
                parent=self,
            )
            return

        # Check global cooldown (persists across dialog instances)
        remaining = self.parent.suggest_cooldown_until - time.monotonic()
        if remaining > 0:
            messagebox.showinfo(
                "Cooldown Active",
                f"Please wait {int(remaining)} more second(s) before suggesting tags again.",
                parent=self,
            )
            return

        # Gather values of all OTHER fields to give the model context
        field_values = {
            f["id"]: self.entries[f["id"]].get_real_value().strip()
            for f in FIELDS
            if f["id"] != "tags"
        }
        if not any(field_values.values()):
            messagebox.showinfo(
                "Nothing to go on",
                "Fill in at least one other field first so the model has context.",
                parent=self,
            )
            return

        self._suggest_btn.config(state="disabled", text="Thinking…")

        active_model = self.parent.settings.get("gemini", {}).get("model", GEMINI_MODEL)

        def worker():
            try:
                tags = gemini_suggest_tags(api_key, field_values, active_model)
                self.after(0, lambda t=tags: self._on_tags_received(t))
            except concurrent.futures.TimeoutError:
                msg = (
                    f"The request timed out after {SUGGEST_API_TIMEOUT_SECS // 60} minutes.\n"
                    "The model did not respond in time. Please try again later."
                )
                self.after(0, lambda m=msg: self._on_suggest_error(m, start_cooldown=False))
            except Exception as exc:
                msg = str(exc)
                self.after(0, lambda m=msg: self._on_suggest_error(m, start_cooldown=False))

        threading.Thread(target=worker, daemon=True).start()

    def _on_tags_received(self, tags: str):
        self.entries["tags"].set_value(tags)
        # Cooldown ticker re-enables when done; also re-check fill state
        self.parent.suggest_cooldown_until = time.monotonic() + SUGGEST_COOLDOWN_SECS
        self._start_cooldown_ticker()

    def _on_suggest_error(self, msg: str, *, start_cooldown: bool = False):
        if start_cooldown:
            self.parent.suggest_cooldown_until = time.monotonic() + SUGGEST_COOLDOWN_SECS
            self._start_cooldown_ticker()
        else:
            # Re-enable immediately – no cooldown on failure
            if self._suggest_btn and self._suggest_btn.winfo_exists():
                self._suggest_btn.config(state="normal", text="✨ Suggest")
        ErrorDialog(self, "Gemini Error", f"Tag suggestion failed:\n\n{msg}")

    def _start_cooldown_ticker(self):
        """Kick off a per-second after() loop that updates the button countdown."""
        self._tick_cooldown()

    def _tick_cooldown(self):
        """Called every second while the cooldown is active and the dialog is alive."""
        if not self._suggest_btn or not self._suggest_btn.winfo_exists():
            return  # dialog was closed
        remaining = self.parent.suggest_cooldown_until - time.monotonic()
        if remaining <= 0:
            # Cooldown finished – restore state based on field fill
            self._update_suggest_btn()
        else:
            mins, secs = divmod(int(remaining), 60)
            label = f"⏳ {mins}:{secs:02d}"
            self._suggest_btn.config(state="disabled", text=label)
            self.after(1000, self._tick_cooldown)

    # ── helpers ───────────────────────────────────────────────────────────────

    def _dummy_choose(self, label: str):
        messagebox.showinfo(
            "Choose", f"Choose option for '{label}' is not yet implemented.", parent=self
        )

    def _save(self):
        project_data = {}
        for field in FIELDS:
            fid = field["id"]
            val = self.entries[fid].get_real_value().strip()
            label = field["label"].rstrip(":")

            if field["required"] and not val:
                messagebox.showerror("Validation Error", f"'{label}' cannot be empty.", parent=self)
                return
            if val and field["type"] == "url":
                if not val.startswith(("http://", "https://")):
                    messagebox.showerror(
                        "Validation Error",
                        f"'{label}' must start with http:// or https://",
                        parent=self,
                    )
                    return
            if val:
                project_data[fid] = val

        if self.edit_index is not None:
            self.parent.update_project(self.edit_index, project_data)
        else:
            self.parent.add_project(project_data)
        self.destroy()


# ─────────────────────────────────────────────────────────────────────────────
# Main application
# ─────────────────────────────────────────────────────────────────────────────

class ProjectManagerApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("ASDK Projects List Manager")
        self.root.geometry("860x480")

        self.settings = load_settings()
        self.project_file = Path(self.settings["projects"]["file_path"])
        self.data: list[dict] = []
        # Epoch timestamp after which the Suggest button is available again (global)
        self.suggest_cooldown_until: float = 0.0

        self._build()
        self.load_data()

    # ── UI ────────────────────────────────────────────────────────────────────

    def _build(self):
        # Toolbar
        toolbar = ttk.Frame(self.root)
        toolbar.pack(side=tk.TOP, fill=tk.X, padx=6, pady=6)

        ttk.Button(toolbar, text="⚙  Settings", command=self.open_settings).pack(side=tk.LEFT)

        # right-side cluster (packed right-to-left)
        ttk.Button(toolbar, text="➕  New", command=self.open_new_window).pack(side=tk.RIGHT)
        self.edit_btn = ttk.Button(
            toolbar, text="✏  Edit", command=self.open_edit_window, state="disabled"
        )
        self.edit_btn.pack(side=tk.RIGHT, padx=6)
        self.del_btn = ttk.Button(
            toolbar, text="🗑  Delete", command=self.delete_selected, state="disabled"
        )
        self.del_btn.pack(side=tk.RIGHT)

        # Project list
        list_frame = ttk.Frame(self.root)
        list_frame.pack(fill=tk.BOTH, expand=True, padx=6, pady=(0, 6))

        self.col_keys = [f["id"] for f in FIELDS if f["id"] != "name"]
        self.col_labels = [f["label"].rstrip(":") for f in FIELDS if f["id"] != "name"]

        self.tree = ttk.Treeview(list_frame, columns=tuple(self.col_labels), selectmode="extended")
        self.tree.heading("#0", text="Name")
        self.tree.column("#0", width=160)

        col_widths = {"description": 220, "url": 160, "demo_url": 120, "tags": 120}
        for key, title in zip(self.col_keys, self.col_labels):
            self.tree.heading(title, text=title)
            self.tree.column(title, width=col_widths.get(key, 120))

        self.tree.bind("<Double-1>", lambda _: self.open_edit_window())
        self.tree.bind("<<TreeviewSelect>>", self._on_select)

        vsb = ttk.Scrollbar(list_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=vsb.set)
        vsb.pack(side=tk.RIGHT, fill=tk.Y)
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.status_var = tk.StringVar(value="Initializing…")
        ttk.Label(self.root, textvariable=self.status_var, anchor=tk.W, relief=tk.SUNKEN).pack(
            fill=tk.X, side=tk.BOTTOM
        )

    # ── Settings ──────────────────────────────────────────────────────────────

    def open_settings(self):
        SettingsWindow(self)

    def apply_settings(self):
        new_path = Path(self.settings["projects"]["file_path"])
        if new_path != self.project_file:
            self.project_file = new_path
            self.load_data()
        self.status_var.set("Settings saved.")

    # ── Data I/O ──────────────────────────────────────────────────────────────

    def load_data(self):
        if not self.project_file.exists():
            messagebox.showerror("Error", f"Projects file not found:\n{self.project_file}")
            self.status_var.set("Failed to load projects file.")
            return
        try:
            with open(self.project_file, "r", encoding="utf-8") as f:
                self.data = json.load(f)
            self._refresh()
            self.status_var.set(
                f"Loaded {len(self.data)} projects from {self.project_file.name}"
            )
        except Exception as exc:
            messagebox.showerror("Error", f"Error loading projects file:\n{exc}")
            self.status_var.set("Error loading data.")

    def _refresh(self):
        for item in self.tree.get_children():
            self.tree.delete(item)
        for project in self.data:
            values = tuple(project.get(k, "") for k in self.col_keys)
            self.tree.insert("", "end", text=project.get("name", "Unnamed"), values=values)

    def _save_data(self):
        try:
            with open(self.project_file, "w", encoding="utf-8") as f:
                json.dump(self.data, f, indent=2)
            self._refresh()
        except Exception as exc:
            messagebox.showerror("Error", f"Failed to save data:\n{exc}")

    # ── List interactions ─────────────────────────────────────────────────────

    def _on_select(self, _event):
        sel = self.tree.selection()
        has_sel = bool(sel)
        self.del_btn.config(state="normal" if has_sel else "disabled")
        # Edit only makes sense for exactly one item
        self.edit_btn.config(state="normal" if len(sel) == 1 else "disabled")

    def open_new_window(self):
        ProjectDialog(self)

    def open_edit_window(self):
        item_id = self.tree.focus()
        if not item_id:
            return
        idx = self.tree.index(item_id)
        if 0 <= idx < len(self.data):
            ProjectDialog(self, edit_index=idx, edit_data=self.data[idx])

    def delete_selected(self):
        sel = self.tree.selection()
        if not sel:
            return
        indices = sorted([self.tree.index(s) for s in sel], reverse=True)
        names = [self.data[i].get("name", "Unnamed") for i in sorted(indices)]
        dlg = DeleteConfirmDialog(self.root, names)
        if not dlg.confirmed:
            return
        for i in indices:
            self.data.pop(i)
        self._save_data()
        self.status_var.set(f"Deleted {len(indices)} project(s). Total: {len(self.data)}")
        # Reset button states
        self.del_btn.config(state="disabled")
        self.edit_btn.config(state="disabled")

    # ── Project CRUD ──────────────────────────────────────────────────────────

    def add_project(self, project_data: dict):
        self.data.append(project_data)
        self._save_data()
        self.status_var.set(f"Added new project. Total: {len(self.data)}")

    def update_project(self, index: int, project_data: dict):
        self.data[index] = project_data
        self._save_data()
        self.status_var.set(f"Updated project. Total: {len(self.data)}")


# ─────────────────────────────────────────────────────────────────────────────
# Dependency check window
# ─────────────────────────────────────────────────────────────────────────────

_INSTALL_INSTRUCTIONS = """\
The 'google-genai' Python package is required for Gemini tag suggestions.
It is NOT installed on your system. The app will still work, but the
✨ Suggest button will be unavailable until you install it.

Install instructions
════════════════════

🐧  Linux / macOS
──────────────────
    pip install google-genai

    If you get an "externally managed" error (Debian/Ubuntu/Arch):
    pip install google-genai --break-system-packages

    Or inside a virtual environment:
    python3 -m venv .venv && source .venv/bin/activate
    pip install google-genai

🪟  Windows
───────────
    Open Command Prompt or PowerShell and run:
    pip install google-genai

    If 'pip' is not on PATH:
    python -m pip install google-genai

📦  Using pipx (any platform)
──────────────────────────────
    pipx install google-genai

After installing, restart this application.
"""


def _show_missing_dependency_window():
    """Show a modal Tk window explaining how to install google-genai."""
    root = tk.Tk()
    root.title("Missing Dependency – google-genai")
    root.geometry("600x480")
    root.resizable(True, True)

    # Heading
    head_frame = ttk.Frame(root, padding=(16, 14, 16, 4))
    head_frame.pack(fill=tk.X)
    tk.Label(
        head_frame,
        text="⚠  Missing Package: google-genai",
        font=("TkDefaultFont", 13, "bold"),
        anchor=tk.W,
    ).pack(fill=tk.X)

    # Scrollable instructions
    txt_frame = ttk.Frame(root, padding=(14, 0, 14, 0))
    txt_frame.pack(fill=tk.BOTH, expand=True)
    txt_frame.rowconfigure(0, weight=1)
    txt_frame.columnconfigure(0, weight=1)

    txt = tk.Text(
        txt_frame,
        wrap=tk.WORD,
        relief=tk.FLAT,
        highlightthickness=1,
        highlightbackground="#cccccc",
        font=("TkFixedFont", 10),
        padx=8, pady=8,
    )
    txt.insert(tk.END, _INSTALL_INSTRUCTIONS)
    txt.config(state=tk.DISABLED)
    txt.grid(row=0, column=0, sticky=tk.NSEW)

    vsb = ttk.Scrollbar(txt_frame, orient="vertical", command=txt.yview)
    txt.configure(yscrollcommand=vsb.set)
    vsb.grid(row=0, column=1, sticky=tk.NS)

    # Footer buttons
    btn_frame = ttk.Frame(root, padding=(14, 8, 14, 14))
    btn_frame.pack(fill=tk.X)
    ttk.Button(
        btn_frame,
        text="Open PyPI page ↗",
        command=lambda: webbrowser.open("https://pypi.org/project/google-genai/"),
    ).pack(side=tk.LEFT)
    ttk.Button(
        btn_frame,
        text="Close and quit",
        command=lambda: (root.destroy(), sys.exit(1)),
    ).pack(side=tk.RIGHT)
    ttk.Button(
        btn_frame,
        text="Continue anyway",
        command=root.destroy,
    ).pack(side=tk.RIGHT, padx=(0, 8))

    root.protocol("WM_DELETE_WINDOW", lambda: (root.destroy(), sys.exit(1)))
    root.mainloop()


# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if not GENAI_AVAILABLE:
        _show_missing_dependency_window()
    root = tk.Tk()
    app = ProjectManagerApp(root)
    root.mainloop()
