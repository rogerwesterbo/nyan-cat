console.log('Nyan!');

function cycleFrames(_nyanCat, _currentFrame) {
  _nyanCat.classList = [];
  _nyanCat.classList.add(`frame${_currentFrame}`);
}

function replicateSparks(_sparksRow) {
  const numberOfRowsToCoverEntireScreen = Math.ceil(document.body.offsetHeight / _sparksRow.offsetHeight);
  const newSparksRows = document.createElement('div');

  for (let a = 0; a < numberOfRowsToCoverEntireScreen - 1; a++) {
    newSparksRows.append(_sparksRow.cloneNode(true));
  }

  document.body.prepend(newSparksRows);
}

(function () {
  const root = document.documentElement;
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  function render() {
    const isLight = root.getAttribute('data-theme') === 'light';
    // Show the mode the button switches TO: dark -> sun, light -> moon.
    toggle.textContent = isLight ? '🌙' : '☀️';
  }

  toggle.addEventListener('click', function () {
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
    } catch (e) {}
    render();
  });

  render();
})();

// Background music: on by default, and remembers if the visitor pauses or mutes it.
window.nyanMusic = (function () {
  const audio = document.querySelector('.audiocontrols audio');
  const listeners = [];

  function read(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {}
  }

  if (!audio) {
    return { isOn: () => false, setOn: function () {}, play: function () {}, onChange: function () {} };
  }

  let wantPlaying = read('music') !== 'off';
  audio.muted = read('music-muted') === 'true';

  function isOn() {
    return wantPlaying && !audio.muted;
  }

  function notify() {
    listeners.forEach((listener) => listener(isOn()));
  }

  function play() {
    if (wantPlaying && audio.paused) audio.play().catch(function () {});
  }

  // Browsers may block autoplay until the first interaction, so try again then.
  // Clicks on the player itself are left alone so they don't fight its own play/pause button.
  function onGesture(e) {
    if (e.target.closest && e.target.closest('.audiocontrols')) return;
    play();
  }
  document.addEventListener('pointerdown', onGesture, true);
  document.addEventListener('keydown', onGesture, true);

  audio.addEventListener('play', function () {
    wantPlaying = true;
    write('music', 'on');
    document.removeEventListener('pointerdown', onGesture, true);
    document.removeEventListener('keydown', onGesture, true);
    notify();
  });
  audio.addEventListener('pause', function () {
    // Browsers can pause media when the tab is hidden; that is not the visitor's choice.
    if (document.hidden) return;
    wantPlaying = false;
    write('music', 'off');
    notify();
  });
  audio.addEventListener('volumechange', function () {
    write('music-muted', String(audio.muted));
    notify();
  });

  function setOn(on) {
    if (on) {
      wantPlaying = true;
      audio.muted = false;
      play();
    } else {
      wantPlaying = false;
      write('music', 'off');
      audio.pause();
    }
    notify();
  }

  play();

  return { isOn: isOn, setOn: setOn, play: play, onChange: (listener) => listeners.push(listener) };
})();

(function () {
  let nyanCat = document.getElementById('nyan-cat');
  let currentFrame = 1;

  replicateSparks(document.getElementsByClassName('sparks-combo')[0]);

  setInterval(function () {
    currentFrame = (currentFrame % 6) + 1;
    cycleFrames(nyanCat, currentFrame);
  }, 70);

  //   let player = document.getElementById("player");
  //   console.log(player);
  //   player.play();
})();
