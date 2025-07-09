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
    <div class="error-loading-projects-icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 512 512"><path fill="currentColor" d="m119.75 21.125l46.313 85.97L19.53 77.904l110.595 88.22l-95.53 21.906l118.81 32.532l-54.218 49.032l89.876-7.22a148 148 0 0 1-2.938-29.405c0-33.145 10.464-63.34 27.875-85.595c17.41-22.254 42.197-36.688 69.813-36.688c.447 0 .898.024 1.343.032L258.25 26.312L234.78 93.72L119.75 21.124zm164.063 108.25c-21.154 0-40.524 10.877-55.094 29.5c-14.572 18.623-23.907 44.906-23.907 74.094c0 30.247 10.36 57.38 25.937 76.155l10.125 12.22l-15.594 2.936c-44.37 8.354-65.334 25.41-77.5 54.033c-11.426 26.885-13.802 65.837-14.06 115.625h46.186v-50.75h18.688v50.75h167.53v-50.75h18.72v50.75h50.53c-.03-50.187-.558-90.043-10.937-117.282c-11.042-28.982-31.384-46.105-79.75-53.72l-15.875-2.498l10.032-12.532c14.82-18.577 23.97-45.282 23.97-74.937c-.002-29.19-9.337-55.472-23.908-74.095c-14.57-18.623-33.94-29.5-55.094-29.5zM251.905 193.5c12.803 0 23.188 17.03 23.188 38.063c0 21.035-10.385 38.093-23.188 38.093s-23.187-17.058-23.187-38.094c0-21.035 10.384-38.062 23.186-38.062zm64.406 0c12.803 0 23.188 17.03 23.188 38.063c0 21.035-10.385 38.093-23.188 38.093s-23.187-17.058-23.187-38.094c0-21.035 10.385-38.062 23.188-38.062z"/></svg>
    </div>
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
        logger.error(`Couldn't fetch ${this.url}: ${error}`);
        this.propogate(null);
      });
  }

  propogate(projects_list) {
    if (projects_list === null) {
      projects_list_container.innerHTML = genLoadError("ERR_NULL_LIST");
      logger.error("Skipping more apps list propogation because projects list is empty...");
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
}

try {
  // Switch to the local json to not make a load on GitHub servers while developing
  // Just gonna let it stay like this for a while so GitHub servers can rest :)
  // or just run tools/update_projects.ps1
  loader = new ProjectsLoader("/assets/data/projects.json");
  // loader = new ProjectsLoader("https://raw.githubusercontent.com/theonlyasdk/libasdk/main/web/data/projects.json");
  // Uncomment this to show the error message with a dummy error
  // throw new Error("Dummy Error");
  loader.load();
  loader.setFilterTagTextAndVisibility(false, '');
} catch (e) {
  projects_list_container.innerHTML = genLoadError('(In initialization): ' + e);
}