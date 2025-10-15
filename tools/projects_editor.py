#!/usr/bin/env python3
import json
import os
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

def validate_url(url):
    if not url.startswith(('http://', 'https://')):
        raise ValueError("Invalid URL. URL should start with 'http://' or 'https://'")

def validate_file(file_path):
    if not os.path.isfile(file_path):
        raise FileNotFoundError(f"File {file_path} does not exist.")
    if not file_path.endswith('.json'):
        raise ValueError("Invalid file type. Only JSON files are allowed.")

class ProjectEditorApp:
    def __init__(self, root):
        self.root = root
        self.root.title("ASDK Projects List Editor")
        self.root.geometry("600x350")
        self.root.resizable(False, False)
        self.data = []
        self.project_file = None

        self.create_menu()
        self.create_widgets()
        self.set_fields_state("disabled")

    def create_menu(self):
        menubar = tk.Menu(self.root)

        file_menu = tk.Menu(menubar, tearoff=0)
        file_menu.add_command(label="Open Project...", command=self.open_project)
        file_menu.add_separator()
        file_menu.add_command(label="Exit", command=self.root.quit)
        menubar.add_cascade(label="File", menu=file_menu)

        self.view_menu = tk.Menu(menubar, tearoff=0)
        self.view_menu.add_command(label="All Projects", command=self.show_all_projects, state="disabled")
        menubar.add_cascade(label="View", menu=self.view_menu)

        help_menu = tk.Menu(menubar, tearoff=0)
        help_menu.add_command(label="About", command=self.show_about)
        menubar.add_cascade(label="Help", menu=help_menu)

        self.root.config(menu=menubar)

    def create_widgets(self):
        frame = ttk.Frame(self.root, padding=10)
        frame.pack(fill=tk.BOTH, expand=True)
        frame.columnconfigure(1, weight=1)

        # Project file is a meta field, not a data field
        ttk.Label(frame, text="Project File:").grid(row=0, column=0, sticky=tk.W, pady=2)
        self.project_entry = ttk.Entry(frame, width=50)
        self.project_entry.grid(row=0, column=1, sticky=tk.EW, padx=0)
        ttk.Button(frame, text="Browse", command=self.open_project).grid(row=0, column=2, padx=(5, 0))

        ttk.Label(frame, text="Name:").grid(row=1, column=0, sticky=tk.W, pady=2)
        self.name_entry = ttk.Entry(frame, width=50)
        self.name_entry.grid(row=1, column=1, columnspan=2, sticky=tk.EW, pady=2)

        ttk.Label(frame, text="Description:").grid(row=2, column=0, sticky=tk.W, pady=2)
        self.desc_entry = ttk.Entry(frame, width=50)
        self.desc_entry.grid(row=2, column=1, columnspan=2, sticky=tk.EW, pady=2)

        ttk.Label(frame, text="URL:").grid(row=3, column=0, sticky=tk.W, pady=2)
        self.url_entry = ttk.Entry(frame, width=50)
        self.url_entry.grid(row=3, column=1, columnspan=2, sticky=tk.EW, pady=2)

        ttk.Label(frame, text="Demo URL (optional):").grid(row=4, column=0, sticky=tk.W, pady=2)
        self.demo_entry = ttk.Entry(frame, width=50)
        self.demo_entry.grid(row=4, column=1, columnspan=2, sticky=tk.EW, pady=2)

        ttk.Label(frame, text="Tags:").grid(row=5, column=0, sticky=tk.W, pady=2)
        self.tags_entry = ttk.Entry(frame, width=50)
        self.tags_entry.grid(row=5, column=1, columnspan=2, sticky=tk.EW, pady=2)

        self.add_button = ttk.Button(frame, text="Add Project", command=self.add_project)
        self.add_button.grid(row=6, column=0, columnspan=3, pady=10)

        self.status_var = tk.StringVar(value="No project loaded.")
        self.status_bar = ttk.Label(self.root, textvariable=self.status_var, anchor=tk.W, relief=tk.SUNKEN)
        self.status_bar.pack(fill=tk.X, side=tk.BOTTOM)

        for entry in [self.name_entry, self.desc_entry, self.url_entry, self.tags_entry]:
            entry.bind("<KeyRelease>", lambda e: self.validate_fields())

    def set_fields_state(self, state):
        fields = [
            self.name_entry,
            self.desc_entry,
            self.url_entry,
            self.demo_entry,
            self.tags_entry,
            self.add_button,
        ]
        for field in fields:
            field.config(state=state)

    def open_project(self):
        file_path = filedialog.askopenfilename(filetypes=[("JSON Files", "*.json")])
        if not file_path:
            return
        self.project_entry.delete(0, tk.END)
        self.project_entry.insert(0, file_path)
        try:
            validate_file(file_path)
            with open(file_path, "r") as f:
                self.data = json.load(f)
            self.project_file = file_path
            self.set_fields_state("normal")
            self.validate_fields()
            self.status_var.set(f"Loaded {len(self.data)} items from {file_path}")
            self.view_menu.entryconfig("All Projects", state="normal")
        except Exception as e:
            self.set_fields_state("disabled")
            self.view_menu.entryconfig("All Projects", state="disabled")
            self.status_var.set("Error loading project file.")
            messagebox.showerror("Error", str(e))
            self.project_file = None

    def validate_fields(self):
        name = self.name_entry.get().strip()
        desc = self.desc_entry.get().strip()
        url = self.url_entry.get().strip()
        tags = self.tags_entry.get().strip()
        if not (name and desc and tags):
            self.add_button.config(state="disabled")
            return
        try:
            validate_url(url)
            self.add_button.config(state="normal")
        except Exception:
            self.add_button.config(state="disabled")

    def add_project(self):
        if not self.project_file:
            messagebox.showerror("Error", "No valid project file loaded.")
            return
        name = self.name_entry.get().strip()
        desc = self.desc_entry.get().strip()
        url = self.url_entry.get().strip()
        demo_url = self.demo_entry.get().strip()
        tags = self.tags_entry.get().strip()
        try:
            if not name:
                raise ValueError("Project name cannot be empty.")
            if not desc:
                raise ValueError("Project description cannot be empty.")
            if not tags:
                raise ValueError("Tags cannot be empty.")
            validate_url(url)
            if demo_url:
                validate_url(demo_url)

            new_entry = {"name": name, "description": desc, "url": url, "tags": tags}
            if demo_url:
                new_entry["demo_url"] = demo_url

            self.data.append(new_entry)
            with open(self.project_file, "w") as f:
                json.dump(self.data, f, indent=2)
            self.status_var.set(f"Added project. Total {len(self.data)} items.")
            self.clear_fields()
        except Exception as e:
            messagebox.showerror("Error", str(e))

    def clear_fields(self):
        self.name_entry.delete(0, tk.END)
        self.desc_entry.delete(0, tk.END)
        self.url_entry.delete(0, tk.END)
        self.demo_entry.delete(0, tk.END)
        self.tags_entry.delete(0, tk.END)
        self.add_button.config(state="disabled")

    def show_all_projects(self):
        if not self.data:
            messagebox.showerror("Error", "No data loaded.")
            return

        win = tk.Toplevel(self.root)
        win.title("All Projects")
        win.geometry("600x400")

        frame = ttk.Frame(win)
        frame.pack(fill=tk.BOTH, expand=True)

        tree = ttk.Treeview(frame, show="tree")  # single column, tree-only mode
        tree.heading("#0", text="Projects")
        tree.column("#0", width=580, anchor=tk.W)

        scrollbar = ttk.Scrollbar(frame, orient="vertical", command=tree.yview)
        tree.configure(yscrollcommand=scrollbar.set)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        tree.pack(fill=tk.BOTH, expand=True, side=tk.LEFT)

        for project in self.data:
            pid = tree.insert("", "end", text=project.get("name", "Unnamed Project"))
            for key, value in project.items():
                if key != "name":
                    tree.insert(pid, "end", text=f"{key.capitalize().replace("_", " ")}: {value}")

        ttk.Label(win, text=f"Loaded {len(self.data)} items from {self.project_file}", anchor=tk.W, relief=tk.SUNKEN).pack(fill=tk.X, side=tk.BOTTOM)
        self.status_var.set(f"Loaded {len(self.data)} items from {self.project_file}")

    def show_about(self):
        messagebox.showinfo(
            "About ASDK Projects List Editor",
            "ASDK Projects List Editor\n(c) theonlyasdk 2025\n\nA simple GUI tool for managing and adding projects to a JSON-based project list."
        )

if __name__ == "__main__":
    root = tk.Tk()
    app = ProjectEditorApp(root)
    root.mainloop()
