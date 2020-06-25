const socket = io('http://localhost:3000');
var text = "A A A A A A A A";
var words = text.split(" ");
var keydownKey = " ";
var characterPos = 0;
var isCorrect = true;
var prev_input_length = 0;
var writtenWords = 0;
var wordsDone = {};
var horses = 0;
var place = 1;
var horseHasBeenInitialized = false;
var playerNumber = 0;

function addText() {
	for (i = 0; i < text.length; i++) {
		let span = document.createElement('span');
		span.innerHTML = text[i];
		span.id = `char-${i}`;
		span.style.color = 'black';
		document.getElementById('text-area').appendChild(span);
	}
}

var keyboard_input = document.getElementById('keyboard-input');

var intervalID = 0;

function initializeHorse(n) {
	let track = document.createElement('div');
	track.className = 'track';
	document.getElementById('track-area').appendChild(track);
	let car = document.createElement('div');
	car.className = 'car';
	car.id = `car0`;
	car.style.backgroundImage = `url("Images/horse${n}.png")`;
	track.appendChild(car);
	let line = document.createElement('div');
	line.className = 'line';
	track.appendChild(line);
	playerNumber = n;
}

// CHECK DIFFERENCE BETWEEN CURRENT HORSES AND SUPPOSED HORSES
function createHorse(n) {
	let horsesCount = document.getElementsByClassName('track').length;
	for (i = horsesCount; i < n; i++) {
		horses++;
		if (horses == playerNumber) {
			horses++;
		}
		let track = document.createElement('div');
		track.className = 'track';
		document.getElementById('track-area').appendChild(track);
		let car = document.createElement('div');
		car.className = 'car';
		car.id = `car${horses}`;
		console.log(`car${horses}`);
		car.style.backgroundImage = `url("Images/horse${horses}.png")`;
		track.appendChild(car);
		let line = document.createElement('div');
		line.className = 'line';
		track.appendChild(line);
	}
}

wordsDone.player = 0;
var step = 70 / words.length;
function makeHorseRun() {
	let playerCounter = 0;
	for (let key in wordsDone) {
		if (wordsDone.hasOwnProperty(key)) {
			console.log("plCount now " + playerCounter);
			document.getElementById(`car${playerCounter}`).style.marginLeft = `${wordsDone[key] * step}%`;
		}
		playerCounter++;
	}
	if (wordsDone.player * step >= 70) {
		clearInterval(intervalID);
	}
}

intervalID = setInterval(makeHorseRun, 1500);

function gameOver() {
	keyboard_input.style.display = "none";
	document.getElementById(`char-${text.length-1}`).style.color = "green";
	document.getElementById("game-over").style.display = "inline-block";
	console.log("you're #" + place);
	socket.emit('game-over', roomName);
}

function underlineWord(w, widx) {
	for (let i = 0; i < w.length; i++) {
		document.getElementById(`char-${widx + i}`).style.textDecoration = 'underline';
	}
}

	var name = "Guest";

	console.log("sockets on");
	socket.on('room-created', room => {
		console.log("room created");
	})

	socket.on('user-has-won', () => {
		place++;
	})

	socket.on('room-deleted', room => {
		console.log("deleteing");
	})

	socket.on('history', message => {
		console.log(message);
	})

	socket.on('user-connected', data => {
		if (!horseHasBeenInitialized) {
			initializeHorse(data.count);
			horseHasBeenInitialized = true;
		}
		createHorse(data.count);
	})

	socket.on('user-disconnected', name => {
		console.log("bye user");
	})

socket.on('other-player-moved', data => {
	let userID = data.userID;
	wordsDone[userID] = data.words;
})

word = words.shift();
// Function works ig;
if (keyboard_input != null) {
	keyboard_input.focus();
	keyboard_input.select();
	addText();
	underlineWord(word, writtenWords);
	socket.emit('new-user', roomName, name);
}

// Every time you get a new word, delete that word from the text
function characterPosition() {
	let keyboard_value = keyboard_input.value;
	let wordIndex = keyboard_value.length-1;
	let keyPressed = keyboard_value.substr(-1);
	let totalIndex = writtenWords + wordIndex;
	let charColor;
	// This is for the first character.
	if (totalIndex >= 0) {
		charColor = document.getElementById(`char-${totalIndex}`).style.color;
	} else {
		// This is fucking cheating.
		charColor = "green";
	}
	// When wrong, this checks for when you're back on track.
	if (!isCorrect && (charColor == "green" || charColor == "red")) {
		isCorrect = true;
	}
	// Deleting.
	if (wordIndex < prev_input_length) {
		for (let i = 0; i < prev_input_length-wordIndex; i++) {
			document.getElementById(`char-${totalIndex+1+i}`).style.color = "black";
		}
		if (wordIndex >= 0) {
			if (keyPressed != word[wordIndex]) {
				document.getElementById(`char-${writtenWords + wordIndex}`).style.color = "red";
			} else {
				document.getElementById(`char-${writtenWords + wordIndex}`).style.color = "green";
			}
		}
		prev_input_length = wordIndex;
		return;
	}
	if (keyPressed == keydownKey) {
		let user_word = keyboard_value.slice(0, keyboard_value.length-1);
		if (word == user_word) {
			writtenWords += wordIndex+1;
			word = words.shift();
			wordsDone.player = wordsDone.player + 1;
			keyboard_input.value = '';
			if (!word) {
				gameOver();
			} else {
				underlineWord(word, writtenWords);
			}
			prev_input_length = 0;
			// You shouldn't generate this twice so find a better way.
			if (!words[0] && word) {
				keydownKey = word.slice(-1);
				word = word.substring(0, word.length - 1);
			}
		}
		socket.emit('key-pressed', roomName, wordsDone.player);
		return;
	}
	if (word && keyPressed == word[wordIndex] && isCorrect) {
		document.getElementById(`char-${writtenWords + wordIndex}`).style.color = "green";
	} else {
		document.getElementById(`char-${writtenWords + wordIndex}`).style.color = "red";
		isCorrect = false;
	}
	prev_input_length = wordIndex;
	socket.emit('key-pressed', roomName, wordsDone.player);
}

window.onload = function() {
	if (keyboard_input != null) {
		keyboard_input.onpaste = function(e) {
			e.preventDefault();
		}
	}
}
