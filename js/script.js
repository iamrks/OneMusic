let mp3Files = [];
let currentSongIndex = 0;
let isPlaying = false; // Variable to track play/pause state
let duration = 0; // Total duration of the current song
let currentTimeInterval; // To store the interval for updating current time

const repoOwner = "codekripa";
let repoName = "NewSongs";

// Get the audio element
const audioElement = document.getElementById("audioElement");

async function getMP3FilesRecursive(path = "") {
  const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`;
  try {
    const response = await fetch(url);
    const files = await response.json();
    let mp3Files = [];
    for (let file of files) {
      if (file.type === "file" && file.name.endsWith(".mp3")) {
        mp3Files.push({
          name: file.name,
          url: `https://raw.githubusercontent.com/${repoOwner}/${repoName}/main/${file.path}`,
        });
      } else if (file.type === "dir") {
        const subDirectoryMP3s = await getMP3FilesRecursive(file.path);
        mp3Files = mp3Files.concat(subDirectoryMP3s);
      }
    }
    return mp3Files;
  } catch (error) {
    console.error("Error fetching file list:", error);
  }
}

function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  
  // Update theme toggle icon
  const themeToggle = document.getElementById('themeToggle');
  themeToggle.innerHTML = `<span class="material-icons-round">${newTheme === 'light' ? 'dark_mode' : 'light_mode'}</span>`;
}

function initializeTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  const themeToggle = document.getElementById('themeToggle');
  themeToggle.innerHTML = `<span class="material-icons-round">${savedTheme === 'light' ? 'dark_mode' : 'light_mode'}</span>`;
  themeToggle.addEventListener('click', toggleTheme);
}

document.addEventListener('DOMContentLoaded', initializeTheme);

async function displayMP3Urls() {
  mp3Files = await getMP3FilesRecursive();
  if (mp3Files.length > 0) {
    let songIndex = getSongIndexToLocalStorage(repoName);
    
    // Update Now Playing info for initial song
    const initialSong = mp3Files[songIndex];
    updateNowPlayingInfo(initialSong.name);
    
    playSpecificSong(songIndex);

    const songListContainer = document.getElementById("songList");
    songListContainer.innerHTML = '';
    mp3Files.forEach((song, index) => {
      const listItem = document.createElement("li");
      listItem.innerHTML = `
        <span class="song-name">${song.name}</span>
        <button class="play-button" data-index="${index}">
          <span class="material-icons-round">
            ${index === currentSongIndex && isPlaying ? 'pause' : 'play_arrow'}
          </span>
        </button>
      `;
      
      const playButton = listItem.querySelector('.play-button');
      playButton.addEventListener('click', () => {
        if (index === currentSongIndex) {
          togglePlayPause();
        } else {
          playSpecificSong(index);
        }
      });
      
      songListContainer.appendChild(listItem);
    });
  } else {
    console.error("No MP3 files found.");
    updateNowPlayingInfo(null); // This will show "Select a song"
  }
}

function updateMediaSessionMetadata() {
  if ("mediaSession" in navigator) {
    const currentSong = mp3Files[currentSongIndex];
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.name,
      artist: "Unknown Artist",
      album: "One Player",
      artwork: [
        {
          src: "./asset/player.jpeg",
          sizes: "512x512",
          type: "image/jpeg",
        },
      ],
    });
    navigator.mediaSession.setActionHandler("play", togglePlayPause);
    navigator.mediaSession.setActionHandler("pause", togglePlayPause);
    navigator.mediaSession.setActionHandler("previoustrack", prevSong);
    navigator.mediaSession.setActionHandler("nexttrack", nextSong);
  }
}

function playSpecificSong(index) {
  // Update previous playing song's button if exists
  const previousButton = document.querySelector(`.play-button[data-index="${currentSongIndex}"]`);
  if (previousButton) {
    previousButton.innerHTML = `<span class="material-icons-round">play_arrow</span>`;
  }

  currentSongIndex = index;
  setSongIndexToLocalStorage(repoName, currentSongIndex);
  const song = mp3Files[currentSongIndex];
  
  // Update Now Playing info
  updateNowPlayingInfo(song.name);
  
  audioElement.src = song.url;
  audioElement.load();

  // Update the new song's button
  const newButton = document.querySelector(`.play-button[data-index="${index}"]`);
  if (newButton) {
    newButton.innerHTML = `<span class="material-icons-round">pause</span>`;
  }

  audioElement.onplay = () => {
    isPlaying = true;
    updatePlayPauseButton();
    currentTimeInterval = setInterval(() => {
      updateSeekBar();
      updateCurrentTime(audioElement.currentTime);
    }, 1000);
  };

  audioElement.onpause = () => {
    isPlaying = false;
    updatePlayPauseButton();
    clearInterval(currentTimeInterval);
  };

  audioElement.onended = nextSong;
  audioElement.onseeked = updateSeekBar;
  audioElement.onloadmetadata = () => {
    duration = audioElement.duration;
    if (!isNaN(duration) && duration > 0) {
      updateSeekBar();
      updateTotalTime();
    }
  };

  updateMediaSessionMetadata();
  audioElement.play();
}

function togglePlayPause() {
  if (isPlaying) {
    audioElement.pause();
    clearInterval(currentTimeInterval);
    isPlaying = false;
  } else {
    audioElement.play();
    isPlaying = true;
    currentTimeInterval = setInterval(() => {
      updateSeekBar();
      updateCurrentTime(audioElement.currentTime);
    }, 1000);
  }
  updatePlayPauseButton();
}

function updatePlayPauseButton() {
  const mainPlayPauseButton = document.getElementById("playPauseButton");
  mainPlayPauseButton.innerHTML = `<span class="material-icons-round">${isPlaying ? 'pause' : 'play_arrow'}</span>`;

  const songButtons = document.querySelectorAll('.play-button');
  songButtons.forEach((button, index) => {
    const isCurrentSong = parseInt(button.dataset.index) === currentSongIndex;
    button.innerHTML = `<span class="material-icons-round">${isCurrentSong && isPlaying ? 'pause' : 'play_arrow'}</span>`;
  });
}

function updateSeekBar() {
  const seekBar = document.getElementById("seek-bar");
  if (duration && !isNaN(duration)) {
    const progress = (audioElement.currentTime / duration) * 100;
    seekBar.value = progress;
  }
}

function updateCurrentTime(currentTime) {
  document.getElementById("current-time").textContent = formatTime(currentTime);
}

function updateTotalTime() {
  const totalTimeDisplay = document.getElementById("total-time");
  if (duration && !isNaN(duration)) {
    totalTimeDisplay.textContent = formatTime(duration);
  } else {
    totalTimeDisplay.textContent = "00:00";
  }
}

function formatTime(time) {
  if (!time || isNaN(time)) return "00:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes < 10 ? "0" + minutes : minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
}

function seekAudio(event) {
  const seekBar = document.getElementById("seek-bar");
  const seekPosition = (seekBar.value / 100) * duration;
  audioElement.currentTime = seekPosition;
  updateCurrentTime(seekPosition);
}

function nextSong() {
  if (currentSongIndex < mp3Files.length - 1) {
    currentSongIndex++;
  } else {
    currentSongIndex = 0;
  }

  playSpecificSong(currentSongIndex);
}

function prevSong() {
  if (currentSongIndex > 0) {
    currentSongIndex--;
  } else {
    currentSongIndex = mp3Files.length - 1;
  }

  playSpecificSong(currentSongIndex);
}

function setSource(repo) {
  repoName = repo;
  displayMP3Urls();
}

function toggleDolby() {
  dolbyEnabled = !dolbyEnabled; // Toggle Dolby status

  const button = document.querySelector('.toggle-dolby-btn');
  button.textContent = dolbyEnabled ? "Disable Dolby" : "Enable Dolby"; // Update button text

  // Reload the current song with the new setting
  playSpecificSong(currentSongIndex);
}

function setSongIndexToLocalStorage(playlistKey, index) {
  localStorage.setItem(playlistKey, index);
}

function getSongIndexToLocalStorage(playlistKey) {
  let songIndex = localStorage.getItem(playlistKey);

  return songIndex ? +songIndex : 0;
}

// Add this new function to initialize seek bar events
function initializeSeekBar() {
  const seekBar = document.getElementById("seek-bar");
  
  seekBar.addEventListener('input', function(e) {
    // Stop the current time updates while seeking
    clearInterval(currentTimeInterval);
    const seekTime = (seekBar.value / 100) * duration;
    updateCurrentTime(seekTime);
  });

  seekBar.addEventListener('change', function(e) {
    const seekTime = (seekBar.value / 100) * duration;
    audioElement.currentTime = seekTime;
    
    if (isPlaying) {
      currentTimeInterval = setInterval(() => {
        updateSeekBar();
        updateCurrentTime(audioElement.currentTime);
      }, 1000);
    }
  });
}

// Add this function to update the Now Playing section
function updateNowPlayingInfo(songName) {
    const currentSongElement = document.querySelector('.current-song-name');
    currentSongElement.textContent = songName || 'Select a song';
}

// Initialize
displayMP3Urls();
