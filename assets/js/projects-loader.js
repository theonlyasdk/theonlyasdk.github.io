let logger = new Logger("LibASDK Projects Loader");
let projects_list_container = document.getElementById("projects-list");
const genLoadError = (msg) => `
    <div class="error-loading-projects">
        <h1>Oops! Unable to load projects!</h1>
        <p>Please check the console and report the error in the issues tab of the GitHub repository for this website!</p>
        <i><b>Reason</b>: <code>${msg}</code></i>
    </div>
`;

function checkNotNullOrEmpty(string) {
    return string !== undefined && string !== null && string !== "";
}

class ProjectsLoader {
    constructor(url) { this.url = url; }

    load = () => {
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

    propogate = (projects_list) => {
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
                tag_elements += `<a href="#${tag}" class="category project-tag">${tag}</a>`
            }

            if (!checkNotNullOrEmpty(name) ||
                !checkNotNullOrEmpty(description) ||
                !checkNotNullOrEmpty(url) ||
                !checkNotNullOrEmpty(tags)) return;

            let btn_demo = `<a href="${demo_url}" target="_blank" class="button" title="Click to see a demo of this project (usually a web app)">Demo</a>`;
            let project_card_template = `
                <div class="project-card">
                  <h1 class="project-card-title"><a href="${url}">${name}</a></h1>
                  <p class="project-card-content">${description}</p>
                  <div class="project-card-bottom">
                      <div class="project-card-tags categories">
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
    }
}
try {
    new ProjectsLoader(
        "https://raw.githubusercontent.com/theonlyasdk/libasdk/main/web/data/projects.json"
    ).load();
} catch (e) {
    projects_list_container.innerHTML = genLoadError(e);
}