let logger = new Logger("LibASDK Projects Loader");
let projects_list_container = document.getElementById("projects-list");
let currentFilterTag = "";
let elemFilterByTag = document.getElementById("filter-by-tag");
var loader = null;

if (!projects_list_container || !projects_list_container.innerHTML) {
  logger.error("Fatal error: Unable to find projects list container!");
  window.alert("Oopsies! Unable to find projects list container!");
}

const genLoadError = (msg) => `
  <div class="error-loading-projects">
        <h1>Oops! Unable to load projects!</h1>
        <p>Please check the console and report the error in the issues tab of the GitHub repository for this website!</p>
        <i><b>Reason</b>: <code>${msg}</code></i>
    </div>
`;

class ProjectsLoader {
  constructor(url) { this.url = url; }

  load() {
    fetch(this.url)
      .then((response) => {
        return response.json();
      }).then((json) => {
        this.propogate(json);
      })
      .catch((error) => {
        logger.error(`Unable to fetch ${this.url}: ${error}`);
        this.propogate(null);
      });
  }

  propogate(projects_list) {
    if (projects_list === null) {
      projects_list_container.innerHTML = genLoadError("ERR_NULL_LIST");
      logger.error("Skipping more apps list propogation because projects list is empty...");;
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
        tag_elements += `<a href="#${tag}" onclick="loader.filterByTag('${tag}')" class="category project-tag">${tag}</a>`
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

      // Prepend element before the rest of the elements
      projects_list_container.innerHTML = project_card_template + projects_list_container.innerHTML;
    });

    document.querySelector(".projects-loading").style.display = "none";

    let searchBoxFilterEvent = () => this.filter(document.querySelector("#projects-search-box").value);;
    let projectSearchBox = document.querySelector("#projects-search-box");

    projectSearchBox.oninput = searchBoxFilterEvent;
    projectSearchBox.onchange = searchBoxFilterEvent;
  }

  filter(filter) {
    const fuzzify = (text) => text.toLowerCase().replace(" ", "")
    const projects = document.querySelectorAll('#projects-list .project-card')
    projects.forEach(task => {
      task.classList.remove('d-none')
      const title = fuzzify(task.querySelector('.project-card-title a').innerText)
      if (!title.includes(fuzzify(filter))) {
        task.classList.add('d-none')
      }
    })
  }

  setFilterTagTextAndVisibility(visible, tagName) {
    let elemFilterText = elemFilterByTag.querySelector("span");

    if (visible) {
      elemFilterByTag.onanimationend = null;
      elemFilterByTag.classList.remove('d-pop-out', 'd-none');
      elemFilterByTag.classList.add('d-pop-in', 'active-tag');
      elemFilterText.innerHTML = tagName;
    }
    else {
      elemFilterByTag.classList.remove('d-pop-in');
      elemFilterByTag.classList.add('d-pop-out');

      if (window.innerWidth <= 768) {
        elemFilterByTag.classList.add('d-none');
      }

      elemFilterByTag.onanimationend = () => {
        elemFilterByTag.classList.remove('active-tag');
        elemFilterText.innerHTML = '';

        if (window.innerWidth > 768) {
          elemFilterByTag.classList.add('d-none');
        }
      };
    }
  }

  filterByTag(tagName) {
    if (document.querySelector('.projects-filter').classList.contains('d-none')) {
      this.toggleProjectsFilter();
    }
  
    this.setFilterTagTextAndVisibility(tagName !== '', tagName);
  
    if (tagName === '') 
      this.scrollToTop();

    const projects = document.querySelectorAll('#projects-list .project-card')
    projects.forEach(task => {
      task.classList.remove('d-none')
      const tags = task.querySelector('.project-card-tags').innerText
      if (!tags.includes(tagName)) {
        task.classList.add('d-none')
      }
    });
  }

  filterByDemo() {
    this.setFilterTagTextAndVisibility(false, '');

    const projects = document.querySelectorAll('#projects-list .project-card');
    projects.forEach(task => {
      task.classList.remove('d-none');
      const demoButton = task.querySelector('.demo-button');
      if (!demoButton) {
        task.classList.add('d-none');
      }
    });
  }

  scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  toggleProjectsFilter() {
    const filterElement = document.querySelector('.projects-filter');
    if (filterElement) {
      if (filterElement.classList.contains('d-none')) {
        filterElement.classList.remove('d-none', 'd-pop-out');
        filterElement.classList.add('d-pop-in');
      } else {
        filterElement.classList.remove('d-pop-in');
        filterElement.classList.add('d-pop-out');
        filterElement.onanimationend = () => {
          filterElement.classList.add('d-none');
          filterElement.onanimationend = null;
        };
      }
    }
  }
}

try {
  // Switch to the local json to not make a load on GitHub servers while developing
  // Just gonna let it stay like this for a while so GitHub servers can rest :)
  // or just run tools/update_projects.ps1
  loader = new ProjectsLoader("/assets/data/projects.json");
  // loader = new ProjectsLoader("https://raw.githubusercontent.com/theonlyasdk/libasdk/main/web/data/projects.json");
  loader.load();
  loader.setFilterTagTextAndVisibility(false, '');
} catch (e) {
  projects_list_container.innerHTML = genLoadError('ERR_LOADER_INIT: ' + e);
}