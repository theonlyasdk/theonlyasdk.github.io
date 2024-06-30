let logger = new Logger("LibASDK Projects Loader");

function checkNotNullOrEmpty (string) {
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
        let projects_list_container = document.getElementById("projects-list");

        const colors = [
            "--purple-1",
            "--royal-blue-1",
            "--teal-1",
        ];

        if (projects_list === null) {
            projects_list_container.innerHTML = `
                <div class="error-loading-projects">
                    <h1>Oops! Unable to load projects!</h1>
                    <p>Please check the console and report the error in the issues tab of the GitHub repository for this website!</p>
                </div>
            `
            logger.error("Skipping more apps list propogation because projects list is empty...");;
            return;
        }
        
        projects_list.forEach(element => {
            let name = element['name'];
            let description = element['description'];
            let url = element['url'];
    
            if (!checkNotNullOrEmpty(name) ||
                !checkNotNullOrEmpty(description) ||
                !checkNotNullOrEmpty(url)) return;
            
            let random_color = colors[Math.floor(Math.random() * colors.length) - 1]
            let project_card_template = `
                <div class="project-card" style="background-color: var(${random_color})">
                  <h1 class="project-card-title"><a href="${url}">${name}</a></h1>
                  <p class="project-card-content">${description}</p>
                  <div class="project-card-tags categories">
                    <a href="#!" class="category"></a>
                  </div>
                </div>
            `;
    
            // Prepend element before the rest of the elements
            projects_list_container.innerHTML = project_card_template + projects_list_container.innerHTML;
        });

        document.querySelector(".projects-loading").style.display = "none";
    }
}

let loader = new ProjectsLoader("https://raw.githubusercontent.com/theonlyasdk/libasdk/main/web/data/more_apps_list.json");

loader.load();