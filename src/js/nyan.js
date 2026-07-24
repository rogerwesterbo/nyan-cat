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
