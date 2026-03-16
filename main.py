import os, sys, requests, zipfile, subprocess, webbrowser
from PyQt5.QtWidgets import (
    QApplication, QWidget, QLabel, QLineEdit, QPushButton, QTextEdit, QFileDialog,
    QVBoxLayout, QHBoxLayout, QProgressBar
)
from PyQt5.QtGui import QPixmap, QFont, QPalette, QColor, QIcon, QMovie
from PyQt5.QtCore import Qt, QSize

class ChromeXRavens(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Chrome x Ravens • Steam Manifest Premium Tool")
        self.setGeometry(400, 100, 650, 740)
        self.setWindowIcon(QIcon("banner.gif"))
        self.download_folder = "downloads"
        self.setup_ui()
        self.set_theme()

    def setup_ui(self):
        layout = QVBoxLayout()
        self.setFont(QFont("Segoe UI", 10))

        # Animated GIF Banner - RESIZED
        self.banner_label = QLabel()
        self.banner_label.setFixedHeight(200)
        self.banner_label.setAlignment(Qt.AlignCenter)
        self.movie = QMovie("banner.gif")
        self.movie.setScaledSize(QSize(600, 200))  # Resize width and height here
        self.banner_label.setMovie(self.movie)
        self.movie.start()
        layout.addWidget(self.banner_label)

        self.app_id_input = QLineEdit()
        self.app_id_input.setPlaceholderText("Enter Steam App ID")
        self.app_id_input.textChanged.connect(self.update_game_cover)
        layout.addWidget(self.app_id_input)

        self.cover_label = QLabel("Game Cover Preview")
        self.cover_label.setAlignment(Qt.AlignCenter)
        self.cover_label.setFixedHeight(200)
        self.cover_label.setStyleSheet("border: 2px solid #5dade2; background-color: #06121e;")
        layout.addWidget(self.cover_label)

        self.download_button = QPushButton("Download")
        self.download_button.clicked.connect(self.download_game)
        layout.addWidget(self.download_button)

        self.folder_button = QPushButton("Choose Download Folder")
        self.folder_button.clicked.connect(self.choose_download_folder)
        layout.addWidget(self.folder_button)

        self.steam_button = QPushButton("Open Steam Client")
        self.steam_button.clicked.connect(self.open_steam)
        layout.addWidget(self.steam_button)

        self.status_box = QTextEdit()
        self.status_box.setReadOnly(True)
        self.status_box.setMinimumHeight(200)
        layout.addWidget(self.status_box)

        self.progress_bar = QProgressBar()
        layout.addWidget(self.progress_bar)

        # Links
        links = QHBoxLayout()
        steamdb = QPushButton("SteamDB")
        steamdb.clicked.connect(lambda: webbrowser.open("https://steamdb.info/"))
        onlinefix = QPushButton("Online-Fix")
        onlinefix.clicked.connect(lambda: webbrowser.open("https://online-fix.me/"))
        links.addWidget(steamdb)
        links.addWidget(onlinefix)
        layout.addLayout(links)

        self.setLayout(layout)

    def set_theme(self):
        palette = QPalette()
        palette.setColor(QPalette.Window, QColor("#0a0e1a"))
        palette.setColor(QPalette.WindowText, QColor("#91dfff"))
        palette.setColor(QPalette.Base, QColor("#0f1c2e"))
        palette.setColor(QPalette.Text, QColor("#ffffff"))
        palette.setColor(QPalette.Button, QColor("#113955"))
        palette.setColor(QPalette.ButtonText, QColor("#a8e4ff"))
        palette.setColor(QPalette.Highlight, QColor("#38b6ff"))
        self.setPalette(palette)

        self.setStyleSheet("""
            QWidget {
                background-color: #0a0e1a;
                color: #a8e4ff;
                font-weight: 500;
                border-radius: 8px;
            }
            QLineEdit, QTextEdit, QPushButton {
                background-color: #112538;
                color: white;
                border: 1px solid #38b6ff;
                padding: 6px;
                border-radius: 6px;
            }
            QPushButton:hover {
                background-color: #1b5e89;
            }
            QProgressBar {
                background-color: #112538;
                color: #a8e4ff;
                border: 1px solid #38b6ff;
                border-radius: 5px;
                text-align: center;
            }
            QProgressBar::chunk {
                background-color: #38b6ff;
                width: 20px;
            }
        """)

    def choose_download_folder(self):
        folder = QFileDialog.getExistingDirectory(self, "Select Folder")
        if folder:
            self.download_folder = folder
            self.status_box.append(f"[INFO] Folder set to: {folder}")

    def open_steam(self):
        steam_path = r"C:\Program Files (x86)\Steam\Steam.exe"
        if os.path.exists(steam_path):
            subprocess.Popen([steam_path])
            self.status_box.append("[INFO] Launched Steam.")
        else:
            self.status_box.append("[ERROR] Steam.exe not found.")

    def update_game_cover(self):
        app_id = self.app_id_input.text().strip()
        if not app_id.isdigit():
            self.cover_label.setText("Invalid App ID")
            return
        url = f"https://cdn.cloudflare.steamstatic.com/steam/apps/{app_id}/library_600x900.jpg"
        try:
            r = requests.get(url)
            if r.status_code == 200:
                pix = QPixmap()
                pix.loadFromData(r.content)
                self.cover_label.setPixmap(pix.scaledToHeight(200))
            else:
                self.cover_label.setText("Cover not found.")
        except:
            self.cover_label.setText("[Error loading image]")

    def download_game(self):
        app_id = self.app_id_input.text().strip()
        if not app_id:
            self.status_box.append("[ERROR] Enter a valid App ID.")
            return

        # Example zip download
        url = "https://www.dropbox.com/scl/fi/y26u2itlljofh3oho9n2l/2567870-Chained-together.zip?rlkey=7s0d906a9ffax81ipewvjsepv&st=fp25fh8p&dl=1"
        self.status_box.append(f"[INFO] Downloading game for App ID {app_id}...")

        try:
            r = requests.get(url, stream=True)
            if r.status_code == 200:
                total = int(r.headers.get('content-length', 0))
                zip_path = os.path.join(self.download_folder, f"{app_id}.zip")
                dest_folder = os.path.join(self.download_folder, app_id)
                os.makedirs(dest_folder, exist_ok=True)

                # Download the zip to a temporary file
                with open(zip_path, 'wb') as f:
                    downloaded = 0
                    for chunk in r.iter_content(8192):
                        if chunk:
                            f.write(chunk)
                            downloaded += len(chunk)
                            if total:
                                percent = int(downloaded * 100 / total)
                                self.progress_bar.setValue(percent)

                # Extract files directly into the destination folder
                with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                    zip_ref.extractall(dest_folder)

                # Remove the zip file so only the raw files remain
                os.remove(zip_path)

                self.status_box.append(f"[SUCCESS] Downloaded to {dest_folder}")
            else:
                self.status_box.append(f"[ERROR] Failed to download: {r.status_code}")
        except Exception as e:
            self.status_box.append(f"[ERROR] {e}")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    gui = ChromeXRavens()
    gui.show()
    sys.exit(app.exec_())
