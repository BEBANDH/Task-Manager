# Task Manager

A powerful and intuitive task management application designed to help you organize your life and work. With features like multiple lists, progress tracking, and activity visualization, you can stay on top of your tasks effortlessly.

## Features

- **📝 Task Management**: Create, edit, and delete tasks with ease. Support for subtasks to break down complex items.
- **bh Multiple Lists**: Organize your tasks into separate folders or lists (e.g., Work, Personal, Shopping).
- **📊 Progress Tracking**: Visual progress bars show your completion rate for each list.
- **📈 Activity Chart**: Visualize your productivity with a monthly chart displaying completed tasks.
- **🌓 Dark/Light Mode**: Seamlessly switch between dark and light themes for comfortable viewing in any lighting.
- **📂 Import & Export**:
  - Export your tasks (single list or multiple lists) to Excel (`.xlsx`).
  - Import tasks from existing Excel files to migrate your data.
- **🔍 Search & Filter**:
  - Filter tasks by status (All, Active, Completed).
  - Search tasks by keyword.
  - Filter activity by Month and Year.
- **💾 Auto-Save**: All your data is automatically saved to your browser's local storage.

## Getting Started

### Prerequisites

All you need is a modern web browser (Chrome, Firefox, Edge, Safari).

### Installation

1.  **Clone the repository** (or download the source code):
    ```bash
    git clone https://github.com/yourusername/task-manager.git
    ```
2.  **Navigate to the project directory**:
    ```bash
    cd task-manager
    ```
3.  **Launch the application**:
    - Simply open `index.html` in your browser.
    - OR serve it using a local server (e.g., with VS Code Live Server or Python `http.server`):
        ```bash
        # Python 3
        python -m http.server 8000
        ```
        Then visit `http://localhost:8000` in your browser.

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Libraries**:
  - [SheetJS (xlsx)](https://sheetjs.com/) - For Excel export/import functionality.
  - [Google Fonts](https://fonts.google.com/) - "Google Sans" font family.
- **Icons**: SVG Icons.

## Project Structure

- `index.html`: Main application structure.
- `style.css`: Styling and themes.
- `script.js`: Core application logic, event handling, and data persistence.

## Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
