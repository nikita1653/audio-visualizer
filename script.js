const startBtn = document.getElementById("startBtn");
const canvas = document.getElementById("visualizer");
const ctx = canvas.getContext("2d");

let audioContext;
let analyser;
let dataArray;

const socket = new WebSocket("ws://localhost:8080/audio-stream");

socket.onopen = () => {
    console.log("WebSocket connected to backend");
};

socket.onerror = (err) => {
    console.error("WebSocket error", err);
};

socket.onmessage = (event) => {
    console.log("Backend says:", event.data);
};

startBtn.addEventListener("click", async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);

        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.85;

        source.connect(analyser);
        dataArray = new Uint8Array(analyser.frequencyBinCount);

        const mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
                socket.send(event.data); // 🔥 SEND AUDIO CHUNK
            }
        };

        mediaRecorder.start(200); // send audio every 200ms

        console.log("Audio streaming started");

        startBtn.disabled = true;
        draw();

    } catch (err) {
        alert("Microphone access denied!");
        console.error(err);
    }
});

function draw() {
    requestAnimationFrame(draw);

    analyser.getByteFrequencyData(dataArray);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 160;

    const half = dataArray.length / 2;

    for (let i = 0; i < half; i++) {
        const value = dataArray[i];
        const barHeight = Math.max(value * 0.8, 12);

        const angle1 = (i / half) * Math.PI;
        const angle2 = angle1 + Math.PI;

        drawBar(angle1, barHeight, i);
        drawBar(angle2, barHeight, i);
    }
}

function drawBar(angle, barHeight, i) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 160;

    const x1 = centerX + Math.cos(angle) * radius;
    const y1 = centerY + Math.sin(angle) * radius;

    const x2 = centerX + Math.cos(angle) * (radius + barHeight);
    const y2 = centerY + Math.sin(angle) * (radius + barHeight);

    ctx.strokeStyle = `hsl(${i * 6}, 100%, 60%)`;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}
