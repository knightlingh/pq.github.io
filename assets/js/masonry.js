(function () {
  var grids = document.querySelectorAll('.masonry-grid');
  if (!grids.length) {
    return;
  }

  var scheduled = false;

  function toNumber(value, fallback) {
    var parsed = parseFloat(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  function findMasonryGrid(el) {
    while (el && el !== document) {
      if (el.classList && el.classList.contains('masonry-grid')) {
        return el;
      }
      el = el.parentNode;
    }
    return null;
  }

  function layoutGrid(grid) {
    var cards = grid.querySelectorAll('.masonry-card');
    if (!cards.length) {
      grid.style.height = '0px';
      return;
    }

    var styles = window.getComputedStyle(grid);
    var columns = parseInt(styles.getPropertyValue('--masonry-columns'), 10);
    if (!columns || columns < 1) {
      columns = 1;
    }
    var gap = toNumber(styles.getPropertyValue('--masonry-gap'), 0);

    grid.classList.add('is-masonry');

    var gridWidth = grid.clientWidth;
    if (!gridWidth) {
      return;
    }

    var columnWidth = (gridWidth - gap * (columns - 1)) / columns;
    if (columnWidth <= 0) {
      columnWidth = gridWidth;
    }

    var colHeights = [];
    for (var i = 0; i < columns; i++) {
      colHeights[i] = 0;
    }

    for (var j = 0; j < cards.length; j++) {
      var card = cards[j];
      card.style.width = columnWidth + 'px';
      card.style.position = 'absolute';
      card.style.left = '0px';
      card.style.top = '0px';
    }

    for (var k = 0; k < cards.length; k++) {
      var currentCard = cards[k];
      var minCol = 0;
      for (var c = 1; c < columns; c++) {
        if (colHeights[c] < colHeights[minCol]) {
          minCol = c;
        }
      }
      var x = (columnWidth + gap) * minCol;
      var y = colHeights[minCol];
      currentCard.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
      colHeights[minCol] = y + currentCard.offsetHeight + gap;
    }

    var maxHeight = 0;
    for (var h = 0; h < colHeights.length; h++) {
      if (colHeights[h] > maxHeight) {
        maxHeight = colHeights[h];
      }
    }
    if (maxHeight > 0) {
      maxHeight -= gap;
    }
    grid.style.height = (maxHeight < 0 ? 0 : maxHeight) + 'px';
  }

  function layoutAll() {
    for (var i = 0; i < grids.length; i++) {
      layoutGrid(grids[i]);
    }
  }

  function scheduleLayout() {
    if (scheduled) {
      return;
    }
    scheduled = true;
    var raf = window.requestAnimationFrame || function (cb) { return window.setTimeout(cb, 16); };
    raf(function () {
      scheduled = false;
      layoutAll();
    });
  }

  window.addEventListener('resize', scheduleLayout);
  window.addEventListener('load', scheduleLayout);

  document.addEventListener('load', function (event) {
    var target = event.target;
    if (!target || target.tagName !== 'IMG') {
      return;
    }
    if (findMasonryGrid(target)) {
      scheduleLayout();
    }
  }, true);

  document.addEventListener('page:updated', scheduleLayout);

  scheduleLayout();
})();
