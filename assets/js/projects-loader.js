const projects_list_container = document.getElementById("projects-list");
const filter_by_tag_container = document.getElementById("filter-by-tag");
const searchBox = document.querySelector('.projects-search-box');
let logger = new Logger("LibASDK Projects Loader");
let current_filter_tag = "";
let projects_data_url = "/assets/data/projects.json";


document.addEventListener('mousemove', (e) => {
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

  projects_list.forEach(element => {
    let name = element['name'];
    let description = element['description'];
    let url = element['url'];
    let tags = element['tags'].split(",");
    let demo_url = ('demo_url' in element) ? element['demo_url'] : "";
    let should_show_demo_btn = ('demo_url' in element);
    let tag_elements = "";

    for (let tag of tags) {
      tag_elements += `<a href="#${tag}" onclick="filter_by_tag('${tag}')" class="category project-tag">${tag}</a>`;
    }

    if (!name || !description || !url || !tags) {
      logger.warn(`Skipping project due to missing fields: ${JSON.stringify(element)}`);
      return;
    }

    let btn_demo = `<a href="${demo_url}" target="_blank" class="button demo-button" title="Click to see a demo of this project (usually a web app)">Demo</a>`;
    let project_card_template = `
          <div class="project-card">
            <h1 class="project-card-title"><a href="${url}">${name}</a></h1>
            <p class="project-card-content">${description}</p>
            <div class="project-card-bottom">
                <div class="project-card-tags categories ">
                  <i class="fa-solid fa-tag category project-tag project-tag-icon" title="Project tags"></i>
                  ${tag_elements}
                </div>
                ${should_show_demo_btn ? btn_demo : ""}
            </div>
          </div>
      `;

    projects_list_container.innerHTML = project_card_template + projects_list_container.innerHTML;
  });

  document.querySelector(".projects-loading").remove();

  let search_box_filter_event = () => filter_by_value_fuzzy(document.querySelector("#projects-search-box").value);
  let project_search_box = document.querySelector("#projects-search-box");

  project_search_box.oninput = search_box_filter_event;
  project_search_box.onchange = search_box_filter_event;
}

function filter_by_value_fuzzy(filter_val) {
  const fuzzify = (text) => text.toLowerCase().replace(" ", "");
  const projects = document.querySelectorAll('#projects-list .project-card');
  projects.forEach(task => {
    task.classList.remove('d-none');
    const title = fuzzify(task.querySelector('.project-card-title a').innerText);
    if (!title.includes(fuzzify(filter_val))) {
      task.classList.add('d-none');
    }
  });
}

function set_filter_tag_text_and_visibility(visible, tag_name) {
  let elem_filter_text = filter_by_tag_container.querySelector("span");

  if (visible) {
    filter_by_tag_container.onanimationend = null;
    filter_by_tag_container.classList.remove('d-pop-out', 'd-none');
    filter_by_tag_container.classList.add('d-pop-in', 'active-tag');
    elem_filter_text.innerHTML = tag_name;
  } else {
    filter_by_tag_container.classList.remove('d-pop-in');
    filter_by_tag_container.classList.add('d-pop-out');

    if (window.innerWidth <= 768) {
      filter_by_tag_container.classList.add('d-none');
    }

    filter_by_tag_container.onanimationend = () => {
      filter_by_tag_container.classList.remove('active-tag');
      elem_filter_text.innerHTML = '';

      if (window.innerWidth > 768) {
        filter_by_tag_container.classList.add('d-none');
      }
    };
  }
}

function filter_by_tag(tag_name) {
  if (document.querySelector('.projects-filter').classList.contains('d-none')) {
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
}

function window_scroll_to_top() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

function toggle_projects_filter() {
  const filter_element = document.querySelector('.projects-filter');
  if (filter_element) {
    if (filter_element.classList.contains('d-none')) {
      filter_element.classList.remove('d-none', 'd-pop-out');
      filter_element.classList.add('d-pop-in');
    } else {
      filter_element.classList.remove('d-pop-in');
      filter_element.classList.add('d-pop-out');
      filter_element.onanimationend = () => {
        filter_element.classList.add('d-none');
        filter_element.onanimationend = null;
      };
    }
  }
}

try {
  try_load_projects();
  set_filter_tag_text_and_visibility(false, '');
} catch (err) {
  projects_list_container.innerHTML = create_load_error_html('An error happened while trying to load projects: ' + err);
}