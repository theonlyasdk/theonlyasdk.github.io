const projects_list_container = document.getElementById("projects-list");
const filter_by_tag_container = document.getElementById("filter-by-tag");
const searchBox = document.querySelector('.projects-search-box');
let logger = new Logger("LibASDK Projects Loader");
let current_filter_tag = "";
let projects_data_url = "/assets/data/projects.json";

document.addEventListener('mousemove', (e) => {
  if (!searchBox) return;
  const rect = searchBox.getBoundingClientRect();
  searchBox.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
  searchBox.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
});

if (!projects_list_container || !projects_list_container.innerHTML) {
  logger.error("Fatal error: Unable to find projects list container!");
  window.alert("Oopsies! Unable to find projects list container! Did you mess with the site!? Please report this issue on GitHub if you did not!");
}

const create_load_error_html = (msg) => `
  <div class="error-loading-projects">
      <i class="bi bi-exclamation-circle-fill" style="font-size: 5em;"></i>
    <h1>Oops! Couldn't load projects</h1>
    <p>Sorry, the project showcase did not load properly.<br>
      This could be due to a network issue or a problem with the server.<br>
      Please <a href="#" onclick="location.reload()" title="Click here to refresh the page">refresh the page</a>, or come back later.
    </p>
    <details style="margin-top:1em;">
      <summary style="cursor:pointer;">Show technical details</summary>
      <pre class="error-message" style="padding:0.5em;border-radius:4px;"><code>${msg}</code></pre>
    </details>
    <p style="margin-top:1em;">
      If this keeps happening, please <a href="https://github.com/theonlyasdk/theonlyasdk.github.io/issues" target="_blank" rel="noopener">report the issue on GitHub</a>.
    </p>
  </div>
`;

function try_load_projects() {
  fetch(projects_data_url)
    .then((response) => response.json())
    .then((json) => render_projects(json))
    .catch((error) => {
      logger.error(`Couldn't fetch ${projects_data_url}: ${error}`);
      render_projects(null);
    });
}

function render_projects(projects_list) {
  if (!projects_list) {
    projects_list_container.innerHTML = create_load_error_html("ERR_NULL_LIST");
    logger.error("Rendering failed: projects_list is null");
    return;
  }

  /* Since the projects list has the last item as the most recent item, we need
     to reverse the list so our CSS fade in animation works properly. */
  projects_list.reverse();

  (async function render_each_item() {
    let i = 0;
    for (let element of projects_list) {
      i++;
      let name = element['name'];
      let description = element['description'];
      let url = element['url'];
      let tags = element['tags'].split(",");
      let demo_url = ('demo_url' in element) ? element['demo_url'] : "";
      let should_show_demo_btn = ('demo_url' in element);

      if (!name || !description || !url || !tags) {
        logger.warn(`Skipping project due to missing fields: ${JSON.stringify(element)}`);
        continue;
      }

      const projectCard = document.createElement('div');
      projectCard.classList.add('project-card', 'fade-in');
      projectCard.style.setProperty('--anim-delay', `${i * 0.1}s`);

      let tag_elements = tags.map(tag => 
        `<a href="#${tag}" onclick="filter_by_tag('${tag}')" class="category project-tag">${tag}</a>`
      ).join('');

      let btn_demo = should_show_demo_btn 
        ? `<a href="${demo_url}" target="_blank" class="button demo-button" title="Click to see a demo of this project (usually a web app)">Demo</a>` 
        : "";

      projectCard.innerHTML = `
      <h1 class="project-card-title"><a href="${url}">${name}</a></h1>
      <p class="project-card-content">${description}</p>
      <div class="project-card-bottom">
        <div class="project-card-tags categories">
          <i class="fa-solid fa-tag category project-tag project-tag-icon" title="Project tags"></i>
          ${tag_elements}
        </div>
        ${btn_demo}
      </div>
    `;

      projects_list_container.append(projectCard);
      setup_project_card_tilt(projectCard);
    }

    const no_results = document.createElement('div');
    no_results.id = 'projects-no-results';
    no_results.className = 'projects-no-results d-none';
    no_results.style.display = 'none';
    no_results.innerHTML = `
      <i class="fa-solid fa-magnifying-glass"></i>
      <p>No results found</p>
    `;
    projects_list_container.append(no_results);
  })();

  document.querySelector(".projects-loading").remove();

  const project_search_box = document.querySelector("#projects-search-box");
  const clear_btn = document.querySelector("#projects-search-clear");

  const update_clear_btn = () => {
    if (!clear_btn || !project_search_box) return;
    if (project_search_box.value.length > 0) {
      clear_btn.classList.remove('is-dissolving');
      clear_btn.classList.add('is-visible');
    } else {
      clear_btn.classList.remove('is-visible');
    }
  };

  const handle_search_clear = () => {
    if (!project_search_box) return;
    if (clear_btn) {
      clear_btn.classList.add('is-dissolving');
      clear_btn.classList.remove('is-visible');
    }
    project_search_box.value = '';
    filter_by_value_fuzzy('');
    project_search_box.focus();
  };

  if (clear_btn) {
    clear_btn.onclick = (e) => {
      e.preventDefault();
      handle_search_clear();
    };
  }

  const search_box_filter_event = () => {
    if (project_search_box) {
      filter_by_value_fuzzy(project_search_box.value);
    }
    update_clear_btn();
  };

  if (project_search_box) {
    project_search_box.oninput = search_box_filter_event;
    project_search_box.onchange = search_box_filter_event;
    project_search_box.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        handle_search_clear();
        project_search_box.blur();
      }
    });
    update_clear_btn();
  }
}

function setup_project_card_tilt(card) {
  /* Guard against touch devices and users preferring reduced motion */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.matchMedia('(hover: none)').matches) {
    return;
  }

  let rafId = null;
  let targetX = 0;
  let targetY = 0;

  card.addEventListener('animationend', () => {
    card.style.animation = 'none';
    card.style.opacity = '1';
  });

  card.addEventListener('mouseenter', () => {
    card.style.animation = 'none';
    card.style.opacity = '1';
    card.style.transition = 'transform 0.18s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.25s ease';
    card.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) scale(1.02) translateY(-2px)';
  });

  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    /* Subtle cursor-tracked tilt + gentle scale */
    const maxTilt = 4.5;
    targetX = ((0.5 - y) * (maxTilt * 2)).toFixed(2);
    targetY = ((x - 0.5) * (maxTilt * 2)).toFixed(2);

    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        card.style.transform = `perspective(600px) rotateX(${targetX}deg) rotateY(${targetY}deg) scale(1.02) translateY(-2px)`;
        rafId = null;
      });
    }
  });

  card.addEventListener('mouseleave', () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    card.style.transition = 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease';
    card.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) scale(1) translateY(0px)';
  });
}

function check_no_results() {
  const no_results = document.getElementById('projects-no-results');
  if (!no_results) return;

  const projects = document.querySelectorAll('#projects-list .project-card');
  let has_visible = false;
  projects.forEach(task => {
    if (!task.classList.contains('d-none')) {
      has_visible = true;
    }
  });

  if (!has_visible && projects.length > 0) {
    no_results.classList.remove('d-none');
    no_results.style.display = 'flex';
  } else {
    no_results.classList.add('d-none');
    no_results.style.display = 'none';
  }
}

function filter_by_value_fuzzy(filter_val) {
  const fuzzify = (text) => text.toLowerCase().replace(/\s+/g, "");
  const projects = document.querySelectorAll('#projects-list .project-card');
  const query = fuzzify(filter_val);
  projects.forEach(task => {
    task.classList.remove('d-none');
    const title = fuzzify(task.querySelector('.project-card-title a').innerText);
    if (!title.includes(query)) {
      task.classList.add('d-none');
    }
  });
  check_no_results();
}

function set_filter_tag_text_and_visibility(visible, tag_name) {
  if (!filter_by_tag_container) return;
  let elem_filter_text = filter_by_tag_container.querySelector("span");

  if (visible) {
    filter_by_tag_container.classList.remove('d-none');
    filter_by_tag_container.classList.add('active-tag');
    if (elem_filter_text) elem_filter_text.innerHTML = tag_name;
  } else {
    filter_by_tag_container.classList.remove('active-tag');
    filter_by_tag_container.classList.add('d-none');
    if (elem_filter_text) elem_filter_text.innerHTML = '';
  }
}

function filter_by_tag(tag_name) {
  const wrapper = document.querySelector('#projects-filter-wrapper');
  if (wrapper && !wrapper.classList.contains('is-open')) {
    toggle_projects_filter();
  }

  set_filter_tag_text_and_visibility(tag_name !== '', tag_name);

  if (tag_name === '') {
    window_scroll_to_top();
  }

  const projects = document.querySelectorAll('#projects-list .project-card');
  projects.forEach(task => {
    task.classList.remove('d-none');
    const tags = task.querySelector('.project-card-tags').innerText;
    if (!tags.includes(tag_name)) {
      task.classList.add('d-none');
    }
  });
  check_no_results();
}

function filter_by_demo() {
  set_filter_tag_text_and_visibility(false, '');

  const projects = document.querySelectorAll('#projects-list .project-card');
  projects.forEach(task => {
    task.classList.remove('d-none');
    const demo_button = task.querySelector('.demo-button');
    if (!demo_button) {
      task.classList.add('d-none');
    }
  });
  check_no_results();
}

function window_scroll_to_top() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

function toggle_projects_filter() {
  const wrapper = document.querySelector('#projects-filter-wrapper');
  const filterBtn = document.querySelector('.btn-search-filter');
  if (wrapper) {
    const isOpen = wrapper.classList.toggle('is-open');
    if (filterBtn) {
      filterBtn.classList.toggle('active', isOpen);
      filterBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
  }
}

try {
  try_load_projects();
  set_filter_tag_text_and_visibility(false, '');
} catch (err) {
  projects_list_container.innerHTML = create_load_error_html('An error happened while trying to load projects: ' + err);
}