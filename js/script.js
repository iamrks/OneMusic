let mp3Files = [];
let currentSongIndex = 0;
let isPlaying = false;
let duration = 0;
let currentTimeInterval;

// Get the audio element
const audioElement = document.getElementById("audioElement");

const API_BASE_URL = 'https://one-audio-streamer.onrender.com/api';

async function getSongsList() {
  try {
    const response = await fetch(`${API_BASE_URL}/songs/list`);
    mp3Files = await response.json();
    return mp3Files;
  } catch (error) {
    console.error("Error fetching songs list:", error);
    return [];
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
  mp3Files = await getSongsList();
  if (mp3Files.length > 0) {
    let songIndex = getSongIndexToLocalStorage('playlist');
    
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
    console.error("No songs found.");
    updateNowPlayingInfo(null);
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

async function playSpecificSong(index) {
  const previousButton = document.querySelector(`.play-button[data-index="${currentSongIndex}"]`);
  if (previousButton) {
    previousButton.innerHTML = `<span class="material-icons-round">play_arrow</span>`;
  }

  currentSongIndex = index;
  setSongIndexToLocalStorage('playlist', currentSongIndex);
  const song = mp3Files[currentSongIndex];
  
  updateNowPlayingInfo(song.name);
  
  audioElement.src = `${API_BASE_URL}${song.path}`;
  audioElement.load();

  // Add loadedmetadata event listener to get duration
  audioElement.onloadedmetadata = () => {
    duration = audioElement.duration;
    updateTotalTime();
  };

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

async function setSource(repo) {
  try {
    const response = await fetch(`${API_BASE_URL}/songs/source`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ repo })
    });
    
    if (!response.ok) {
      throw new Error('Failed to change source');
    }
    
    const { songs } = await response.json();
    mp3Files = songs;
    currentSongIndex = 0;
    
    // Update playlist name
    document.querySelector('.playlist-name').textContent = `From: ${repo}`;
    
    // Update category button highlighting
    updateCategoryButtons(repo);
    
    // Refresh the song list
    displayMP3Urls();
  } catch (error) {
    console.error('Error changing source:', error);
  }
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

// Function to wake up the server
async function wakeUpServer() {
  try {
    await fetch(`${API_BASE_URL}/health`);
  } catch (error) {
    console.log('Server waking up...');
  }
}

// Call this when your app starts
async function initializeApp() {
  await wakeUpServer();
  // Wait a bit for server to wake up if it was sleeping
  await new Promise(resolve => setTimeout(resolve, 2000));
  // Then initialize your app
  displayMP3Urls();
}

// Call initializeApp instead of displayMP3Urls on page load
document.addEventListener('DOMContentLoaded', initializeApp);

// Add this new function to handle category button highlighting
function updateCategoryButtons(selectedRepo) {
  // Remove active class from all category buttons
  document.querySelectorAll('.category-btn').forEach(button => {
    button.classList.remove('active');
  });
  
  // Add active class to the selected button
  const buttons = {
    'NewSongs': 'New',
    'OldMusic': 'Old',
    'bhakti': 'Bhakti'
  };
  
  // Find and highlight the correct button
  document.querySelectorAll('.category-btn').forEach(button => {
    if (button.textContent === buttons[selectedRepo]) {
      button.classList.add('active');
    }
  });
}
