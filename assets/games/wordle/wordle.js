/* Wordle game logic */
window.initWordle = function initWordle(root) {
  const scope = root || document;
  const openBtn = scope.querySelector('#wordle-open');
  const overlay = scope.querySelector('#wordle-overlay');
  const closeBtn = scope.querySelector('#wordle-close');

  const rows = 6;
  const cols = 5;
  const boardEl = scope.querySelector('#wordle-board');
  const keyboardEl = scope.querySelector('#wordle-keyboard');
  const messageEl = scope.querySelector('#wordle-message');
  const refreshBtn = scope.querySelector('#wordle-refresh');
  let messageTimer = null;

  if (!boardEl || !keyboardEl || !messageEl) {
    return;
  }

  const masterWords = [
    'ABACK','ABATE','ABBOT','ABIDE','ABLED','ABODE','ABOUT','ABOVE','ABYSS','ACORN',
    'ACRID','ACTOR','ACUTE','ADAPT','ADEPT','ADMIN','ADMIT','ADOBE','ADOPT','ADORE',
    'ADORN','AHEAD','AISLE','ALBUM','ALERT','ALGAE','ALIBI','ALIEN','ALIGN','ALIVE',
    'ALLEY','ALLOT','ALLOW','ALLOY','ALONG','ALPHA','ALTAR','ALTER','AMBER','AMBLE',
    'AMEND','AMONG','AMPLE','AMUSE','ANGEL','ANGER','ANGLE','ANGRY','ANKLE','APPLE',
    'APPLY','APRIL','ARENA','ARGUE','ARISE','ARMOR','AROMA','ARRAY','ARROW','ARTSY',
    'ASCOT','ASHEN','ASIDE','ASKEW','ASSET','ATLAS','ATTIC','AUDIO','AUGUR','AVAIL',
    'AVOID','AWAKE','AWARD','AWARE','AWFUL','AXIAL','AXION','AZURE','BACON','BADGE',
    'BADLY','BAGEL','BAGGY','BAKER','BALER','BALMY','BANJO','BARGE','BASIL','BASIN',
    'BASIC','BATHE','BATON','BATCH','BAYOU','BEACH','BEADS','BEAKS','BEAMS','BEANS',
    'BEARD','BEAST','BEATS','BEAUT','BEECH','BEEFY','BEGIN','BEGUN','BEING','BELAY',
    'BELCH','BELIE','BELLE','BELLY','BELOW','BENCH','BERET','BERRY','BERTH','BEVEL',
    'BIBLE','BICEP','BIDDY','BIDET','BIGLY','BIGOT','BIKER','BILGE','BILLY','BINGE',
    'BINGO','BIOME','BIRCH','BIRTH','BISON','BITER','BITSY','BLACK','BLADE','BLAME',
    'BLAND','BLANK','BLARE','BLAST','BLAZE','BLEAK','BLEAT','BLEED','BLEEP','BLEND',
    'BLESS','BLIMP','BLINK','BLISS','BLITZ','BLOAT','BLOOM','BLOWN','BLUER','BLUFF',
    'BLUNT','BLURB','BLURT','BLUSH','BOARD','BOAST','BOBBY','BODGE','BOGEY','BOGGY',
    'BOGLE','BOING','BOINK','BOLDY','BOLUS','BOMBS','BONED','BONEY','BONUS','BOOED',
    'BOOGY','BOOKS','BOOST','BOOTH','BOOTY','BORAX','BORED','BORER','BORNE','BOSOM',
    'BOSON','BOSSY','BOTCH','BOTHY','BOWER','BOWLS','BOXED','BOXER','BOXES','BOYAR',
    'BOYED','BRAIN','BRAKE','BRAND','BRASH','BRAVE','BRAVO','BRAWN','BREAD','BREAK',
    'BREED','BRIAR','BRIBE','BRICK','BRIDE','BRIEF','BRINE','BRING','BRINK','BRISK',
    'BROAD','BROIL','BROKE','BROOD','BROOK','BROOM','BROWN','BRUNT','BRUSH','BRUTE',
    'BUDDY','BUDGE','BUGGY','BUGLE','BUILD','BUILT','BULGE','BULKY','BULLY','BUNCH',
    'BUNNY','BURST','BUSED','BUSHY','BUTTE','BUXOM','CABIN','CABLE','CACAO','CACHE',
    'CACTI','CADDY','CADET','CAGED','CAGEY','CAIRN','CAMEL','CAMEO','CANAL','CANDY',
    'CANOE','CANON','CAPER','CAPES','CAPUT','CARAT','CARDS','CARED','CARES','CARGO',
    'CAROL','CARRY','CARVE','CASTE','CATCH','CATER','CAUSE','CAVIL','CEASE','CEDAR',
    'CELLO','CHANT','CHAOS','CHAPS','CHARM','CHART','CHASE','CHASM','CHEAP','CHEAT',
    'CHECK','CHEEK','CHEER','CHESS','CHEST','CHEWY','CHIEF','CHILD','CHILL','CHIME',
    'CHINA','CHIRP','CHOCK','CHOIR','CHOKE','CHORD','CHORE','CHOSE','CHOWS','CHUCK',
    'CHUMP','CHUNK','CHURN','CHUTE','CIDER','CINCH','CIRCA','CIVIC','CIVIL','CLACK',
    'CLAIM','CLAMP','CLANG','CLANK','CLASH','CLASP','CLASS','CLEAN','CLEAR','CLEAT',
    'CLEFT','CLERK','CLICK','CLIFF','CLIMB','CLING','CLINK','CLOAK','CLOCK','CLONE',
    'CLOSE','CLOTH','CLOUD','CLOVE','CLOWN','CLUCK','CLUMP','CLUNG','COACH','COAST',
    'COBRA','COCOA','CODER','COLON','COLOR','COMET','COMFY','COMIC','COMMA','CONCH',
    'CONDO','CONIC','CORAL','CORDS','CORED','CORKS','CORNY','CORPS','COUCH','COUGH',
    'COULD','COUNT','COUPE','COURT','COVEN','COVER','COVET','COWER','COYLY','CRACK',
    'CRAFT','CRANE','CRANK','CRASH','CRATE','CRAVE','CRAWL','CRAZE','CREAK','CREDO',
    'CREED','CREEK','CREEP','CREPE','CREPT','CREST','CRICK','CRIER','CRIME','CRIMP',
    'CRISP','CROAK','CROCK','CRONE','CRONY','CROOK','CROSS','CROWD','CROWN','CRUDE',
    'CRUEL','CRUMB','CRUSH','CRUST','CRYPT','CUBIC','CUMIN','CURIO','CURLY','CURRY',
    'CURSE','CURVE','CURVY','CYCLE','DADDY','DAIRY','DAISY','DANCE','DANDY','DATED',
    'DEALT','DEBIT','DEBUT','DECAL','DECAY','DECOR','DEFER','DEITY','DELTA','DELVE',
    'DEMON','DEMUR','DENIM','DENSE','DEPOT','DEPTH','DERBY','DESKS','DETER','DETOX',
    'DEUCE','DEVIL','DHOWS','DIARY','DICEY','DIEGO','DIETY','DIGIT','DIMLY','DINER',
    'DINGO','DINGY','DIODE','DIRGE','DIRTY','DISCO','DITCH','DITTO','DITTY','DIVER',
    'DIZZY','DODGE','DODGY','DOGMA','DOING','DOLLY','DOMED','DONOR','DONUT','DOORS',
    'DOSER','DOUBT','DOUGH','DOUSE','DOVES','DOWEL','DOWNY','DOWRY','DOZED','DOZEN',
    'DRAFT','DRAMA','DRANK','DRAPE','DRAWL','DRAWN','DREAM','DRESS','DRIFT','DRILL',
    'DRINK','DRIVE','DROOP','DROPS','DROVE','DROWN','DRUID','DRYER','DUCKS','DUMMY',
    'DUMPL','DUMPY','DUNCE','DUPED','DUSTY','DUTCH','DUVET','DWARF','DWELL','DWELT',
    'EAGER','EAGLE','EARLY','EARTH','EASEL','EASER','EATEN','EATER','EBONY','ECLAT',
    'EDICT','EDIFY','EERIE','EGRET','EIGHT','ELATE','ELBOW','ELDER','ELECT','ELFIN',
    'ELIDE','ELITE','ELUDE','ELVEN','ELVES','EMAIL','EMBER','EMCEE','EMPTY','ENACT',
    'ENDOW','ENEMY','ENJOY','ENNUI','ENSUE','ENTER','ENTRY','ENVOY','EPOCH','EPOXY',
    'EQUAL','EQUIP','ERASE','ERECT','ERODE','ERROR','ESSAY','ETHIC','ETHOS','ETUDE',
    'EVADE','EVENT','EVERY','EVOKE','EXACT','EXALT','EXCEL','EXERT','EXILE','EXIST',
    'EXPEL','EXTOL','EXTRA','EXULT','FABLE','FACET','FACTS','FADED','FAERY','FAINT',
    'FAIRY','FAITH','FALSE','FANCY','FANNY','FARCE','FATTY','FAULT','FAUNA','FAVOR',
    'FEAST','FELON','FEMME','FENCE','FERAL','FERRY','FETAL','FETCH','FIBER','FICUS',
    'FIFTY','FIGHT','FILET','FILLY','FILMS','FILMY','FINAL','FINCH','FINER','FINES',
    'FIORD','FIRED','FIRMS','FIRST','FISHY','FIXED','FJORD','FLAIR','FLAKE','FLAME',
    'FLANK','FLARE','FLASH','FLEET','FLESH','FLICK','FLING','FLOAT','FLOCK','FLOOD',
    'FLOOR','FLORA','FLOUR','FLOSS','FLOWN','FLUFF','FLUID','FLUKE','FLUME','FLUNG',
    'FLUTE','FLYER','FOCAL','FOCUS','FOGGY','FOIST','FOLDS','FOLLY','FORCE','FORGE',
    'FORGO','FORTH','FORTY','FORUM','FOUND','FOXES','FRAIL','FRAME','FRANK','FRAUD',
    'FRESH','FRIAR','FRIED','FRILL','FRISK','FROCK','FROND','FRONT','FROST','FROTH',
    'FROWN','FROZE','FRUIT','FUDGE','FUELS','FUZZY','GAFFE','GAILY','GAINS','GALES',
    'GAMER','GAMMA','GAMUT','GANGS','GAUZE','GAWKY','GAYER','GAYLY','GAZER','GECKO',
    'GEESE','GENIE','GENRE','GENTY','GENUS','GHOST','GIANT','GIDDY','GIFTY','GIGAS',
    'GILTS','GIRTH','GIVER','GLADE','GLAND','GLARE','GLASS','GLEAM','GLEAN','GLIDE',
    'GLINT','GLOAT','GLOBE','GLOOM','GLORY','GLOSS','GLOVE','GLYPH','GNASH','GNOME',
    'GOALS','GOING','GOLLY','GONER','GOODS','GOOEY','GOOFY','GOOSE','GOREN','GORGE',
    'GORSE','GOTTA','GOURD','GRACE','GRADE','GRAIN','GRAND','GRANT','GRAPE','GRAPH',
    'GRASP','GRASS','GRATE','GRAVE','GRAVY','GRAZE','GREAT','GREED','GREEN','GREET',
    'GRIEF','GRILL','GRIME','GRIMY','GRIND','GRIPE','GROAN','GROIN','GROOM','GROVE',
    'GROWL','GRUEL','GRUFF','GRUNT','GUARD','GUAVA','GUESS','GUEST','GUIDE','GUILD',
    'GUILE','GUILT','GUISE','GULCH','GULLY','GUMBO','GUMMY','GUPPY','GUSTO','GUSTY',
    'HABIT','HAILS','HAIRY','HALVE','HANDY','HAPPY','HARDY','HAREM','HAREY','HARPY',
    'HARRY','HARSH','HASTE','HASTY','HATCH','HATER','HAUNT','HAVEN','HAZEL','HEADY',
    'HEARD','HEART','HEATH','HEAVE','HEAVY','HEDGE','HEFTY','HEIST','HELIX','HELLO',
    'HELMY','HENCE','HERON','HERTZ','HINGE','HIPPO','HIPPY','HIRED','HOBBY','HOIST',
    'HOLLY','HOMER','HONEY','HONOR','HOODE','HOOFY','HOOKA','HOOPS','HOOTY','HOPED',
    'HORDE','HORSE','HOTEL','HOUND','HOUSE','HOVER','HOWDY','HUMAN','HUMID','HUMOR',
    'HUMPH','HUMUS','HUNCH','HUNKY','HURRY','HUSKY','HUTCH','HYENA','HYPER','ICIER',
    'ICING','IDEAL','IDIOM','IDIOT','IDLER','IDYLL','IGLOO','IMAGE','IMBUE','IMPEL',
    'IMPLY','INANE','INCUR','INDEX','INEPT','INERT','INFER','INGOT','INLAY','INLET',
    'INNER','INPUT','INTER','INTRO','IONIC','IRONY','ISLET','ISSUE','ITCHY','IVORY',
    'JADED','JAILS','JAUNT','JAZZY','JELLY','JERKY','JETTY','JEWEL','JIGSA','JINGO',
    'JOINT','JOLLY','JOUST','JUDGE','JUICE','JUICY','JUMBO','JUMPY','JUNTA','JUNTO',
    'JUROR','KAYAK','KEBAB','KHAKI','KINKY','KIOSK','KISSY','KITTY','KNACK','KNAVE',
    'KNEAD','KNEEL','KNELT','KNIFE','KNOCK','KNOLL','KNOWN','KOALA','LABEL','LABOR',
    'LADLE','LAGER','LAIRD','LAITY','LANCE','LANDS','LAPEL','LAPSE','LARGE','LARVA',
    'LASER','LATHE','LATTE','LAUGH','LAYER','LEACH','LEAFY','LEAKY','LEANT','LEARN',
    'LEASE','LEASH','LEAST','LEAVE','LEDGE','LEECH','LEERY','LEFTY','LEGAL','LEGGY',
    'LEMON','LEMUR','LEPER','LEVEL','LEVER','LIBEL','LIDAR','LIEGE','LIFER','LIFTY',
    'LIGHT','LIKEN','LILAC','LIMBO','LIMIT','LINEN','LINER','LINGO','LIONS','LIPID',
    'LITER','LIVID','LLAMA','LOAMY','LOCAL','LOCUS','LODGE','LOFTY','LOGIC','LOGIN',
    'LOLLY','LONGS','PANDA','OTTER','TIGER','SHARK','ZEBRA','SMILE','PEACH'
  ];
  const answerPools = { default: masterWords };
  const validWordSet = new Set(masterWords);
  const keyRows = [
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['ENTER','Z','X','C','V','B','N','M','DEL']
  ];

  let secret = pickWord();
  let currentRow = 0;
  let currentCol = 0;
  let finished = false;
  let grid = createGrid();

  buildBoard();
  buildKeyboard();
  setMessage('Type or tap to guess the 5-letter word.');

  if (openBtn && overlay) {
    openBtn.addEventListener('click', () => {
      overlay.classList.add('active');
      document.body.classList.add('wordle-no-scroll');
      overlay.setAttribute('aria-hidden', 'false');
    });
  }
  if (closeBtn && overlay) {
    closeBtn.addEventListener('click', closeOverlay);
  }

  window.addEventListener('keydown', onKeydown);
  if (refreshBtn) {
    refreshBtn.addEventListener('click', resetGame);
  }

  function createGrid() {
    return Array.from({ length: rows }, () => Array(cols).fill(''));
  }

  function pickWord() {
    const bucket = answerPools.default;
    return bucket[Math.floor(Math.random() * bucket.length)];
  }

  function buildBoard() {
    boardEl.innerHTML = '';
    for (let r = 0; r < rows; r++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'wordle-row';
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement('div');
        cell.className = 'wordle-cell';
        cell.dataset.row = String(r);
        cell.dataset.col = String(c);
        rowEl.appendChild(cell);
      }
      boardEl.appendChild(rowEl);
    }
  }

  function buildKeyboard() {
    keyboardEl.innerHTML = '';
    keyRows.forEach(letters => {
      const rowEl = document.createElement('div');
      rowEl.className = 'wordle-keyboard-row';
      letters.forEach(letter => {
        const key = document.createElement('button');
        key.type = 'button';
        key.textContent = letter === 'DEL' ? 'DEL' : letter;
        key.dataset.key = letter;
        key.className = 'wordle-key';
        key.addEventListener('click', () => handleInput(letter));
        rowEl.appendChild(key);
      });
      keyboardEl.appendChild(rowEl);
    });
  }

  function onKeydown(event) {
    if (!overlay || !overlay.classList.contains('active')) return;
    const key = event.key;
    if (/^[a-zA-Z]$/.test(key)) {
      const letter = key.toUpperCase();
      flashKey(letter);
      handleInput(letter);
    } else if (key === 'Backspace') {
      flashKey('DEL');
      handleInput('DEL');
    } else if (key === 'Enter') {
      flashKey('ENTER');
      handleInput('ENTER');
    }
  }

  function handleInput(input) {
    if (finished) return;

    if (input === 'ENTER') {
      submitGuess();
      return;
    }

    if (input === 'DEL') {
      if (currentCol > 0) {
        currentCol -= 1;
        grid[currentRow][currentCol] = '';
        paintCell(currentRow, currentCol, '');
      }
      return;
    }

    if (/^[A-Z]$/.test(input) && currentCol < cols) {
      grid[currentRow][currentCol] = input;
      paintCell(currentRow, currentCol, input);
      currentCol += 1;
    }
  }

  function paintCell(row, col, letter) {
    const cell = boardEl.querySelector(`.wordle-cell[data-row="${row}"][data-col="${col}"]`);
    if (!cell) return;
    cell.textContent = letter;
    if (letter) {
      cell.classList.add('filled');
    } else {
      cell.classList.remove('filled');
      cell.removeAttribute('data-state');
    }
  }

  function submitGuess() {
    if (currentCol < cols) {
      setMessage('Need a 5-letter word.', 'warn');
      return;
    }

    const guess = grid[currentRow].join('');
    if (!validWordSet.has(guess)) {
      setMessage('Not in the word list.', 'warn');
      return;
    }

    const results = scoreGuess(guess, secret);
    revealRow(currentRow, results, () => updateKeyboard(guess, results));

    if (guess === secret) {
      finished = true;
      setMessage(`You solved it in ${currentRow + 1}/6!`, 'win');
      return;
    }

    if (currentRow === rows - 1) {
      finished = true;
      setMessage(`Out of tries. The word was ${secret}.`, 'lose');
      return;
    }

    currentRow += 1;
    currentCol = 0;
    setMessage('Nice try. Keep going.');
  }

  function scoreGuess(guess, target) {
    const statuses = Array(cols).fill('absent');
    const counts = {};

    for (let i = 0; i < target.length; i++) {
      const letter = target[i];
      counts[letter] = (counts[letter] || 0) + 1;
    }

    for (let i = 0; i < cols; i++) {
      if (guess[i] === target[i]) {
        statuses[i] = 'correct';
        counts[guess[i]] -= 1;
      }
    }

    for (let i = 0; i < cols; i++) {
      if (statuses[i] === 'correct') continue;
      const letter = guess[i];
      if (counts[letter] > 0) {
        statuses[i] = 'present';
        counts[letter] -= 1;
      }
    }

    return statuses;
  }

  function revealRow(rowIndex, results, onDone) {
    const rowCells = boardEl.querySelectorAll(`.wordle-cell[data-row="${rowIndex}"]`);
    const delay = 130;
    rowCells.forEach((cell, idx) => {
      setTimeout(() => {
        cell.classList.add('revealing');
        const state = results[idx];
        cell.dataset.state = state;
        cell.classList.remove('filled');
        cell.addEventListener('animationend', () => {
          cell.classList.remove('revealing');
        }, { once: true });
      }, idx * delay);
    });

    if (onDone) {
      setTimeout(onDone, rowCells.length * delay + 80);
    }
  }

  function updateKeyboard(guess, results) {
    const priority = { unused: 0, absent: 1, present: 2, correct: 3 };
    for (let i = 0; i < guess.length; i++) {
      const letter = guess[i];
      const state = results[i];
      const keyEl = keyboardEl.querySelector(`[data-key="${letter}"]`);
      if (!keyEl) continue;
      const previous = keyEl.dataset.state || 'unused';
      if (priority[state] > priority[previous]) {
        keyEl.dataset.state = state;
      }
    }
  }

  function flashKey(input) {
    const keyEl = keyboardEl.querySelector(`[data-key="${input}"]`);
    if (!keyEl) return;
    keyEl.classList.add('is-pressed');
    setTimeout(() => keyEl.classList.remove('is-pressed'), 120);
  }

  function setMessage(text, tone = 'info') {
    if (messageTimer) {
      clearTimeout(messageTimer);
    }
    messageEl.textContent = text;
    messageEl.dataset.tone = tone;
    requestAnimationFrame(() => {
      messageEl.classList.add('is-visible');
    });

    const hideAfter = tone === 'win' || tone === 'lose' ? 4200 : 2600;
    messageTimer = setTimeout(() => {
      messageEl.classList.remove('is-visible');
    }, hideAfter);
  }

  function resetGame() {
    secret = pickWord();
    grid = createGrid();
    currentRow = 0;
    currentCol = 0;
    finished = false;

    boardEl.querySelectorAll('.wordle-cell').forEach(cell => {
      cell.textContent = '';
      cell.classList.remove('filled');
      cell.removeAttribute('data-state');
    });

    keyboardEl.querySelectorAll('.wordle-key').forEach(key => {
      key.removeAttribute('data-state');
    });

    setMessage('New word loaded. Start guessing!');
  }

  function closeOverlay() {
    overlay.classList.remove('active');
    document.body.classList.remove('wordle-no-scroll');
    overlay.setAttribute('aria-hidden', 'true');
  }
};
