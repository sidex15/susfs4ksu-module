const canvas = document.getElementById('backgroundCanvas');
const ctx = canvas.getContext('2d');
import blue from '/assets/amongus/blue.png';
import brown from '/assets/amongus/brown.png';
import brown1 from '/assets/amongus/brown.png';
import cyan from '/assets/amongus/cyan.png';
import cyan1 from '/assets/amongus/cyan1.png';
import orange from '/assets/amongus/orange.png';
import orange1 from '/assets/amongus/orange1.png';
import yellow from '/assets/amongus/yellow.png';
import yellow1 from '/assets/amongus/yellow1.png'; 
import green from '/assets/amongus/green.png';
import lime from '/assets/amongus/lime.png';
import pink from '/assets/amongus/pink.png';
import purple from '/assets/amongus/purple.png';
import red from '/assets/amongus/red.png';
import white from '/assets/amongus/white.png';  
import black from '/assets/amongus/black.png';  

// Resize canvas dynamically
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initializeObjects(); // Reinitialize objects on resize
}

// Star and icon configurations
const stars = [];
const icons = [];
const STAR_COUNT = 100;
const ICON_PATHS = [
    blue,
    brown,
    brown1,
    cyan,
    cyan1,
    orange,
    orange1,
    yellow,
    yellow1,
    green,
    lime,
    pink,
    purple,
    red,
    white,
    black
];
const ICON_COUNT = ICON_PATHS.length;

/// Initialize stars
function initializeStars() {
    stars.length = 0; // Clear existing stars
    for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 2,
            speed: Math.random() * 0.5,
        });
    }
}

// Utility function to shuffle an array and pick a subset
function getRandomSubset(array, count) {
    const shuffled = [...array].sort(() => 0.5 - Math.random()); // Shuffle array
    return shuffled.slice(0, count); // Return the first `count` items
}

// Load icons and initialize their positions and rotation
function initializeObjects() {
    icons.length = 0; // Clear existing icons

    // Get a random subset of ICON_PATHS
    const selectedIcons = getRandomSubset(ICON_PATHS, 6);

    // Load the selected icons
    selectedIcons.forEach((path) => {
        const img = new Image();
        img.src = path;
        img.onload = () => {
            icons.push({
                img,
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                width: 50, // Adjust the size of icons
                height: 60,
                rotation: Math.random() * Math.PI * 2, // Random initial rotation
                rotationSpeed: (Math.random() - 0.5) * 0.02, // Slow rotation
                speedX: (Math.random() - 0.5) * 1.5, // Floating in random directions
                speedY: (Math.random() - 0.5) * 1.5,
            });
        };
    });
}

// Draw stars and icons
function drawScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw stars
    ctx.fillStyle = 'white';
    stars.forEach((star) => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();

        // Move stars downward
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });

    // Draw and move icons
    icons.forEach((icon) => {
        ctx.save(); // Save the current canvas state

        // Translate context to icon's center for rotation
        ctx.translate(icon.x + icon.width / 2, icon.y + icon.height / 2);
        ctx.rotate(icon.rotation);

        // Draw the icon
        ctx.drawImage(
            icon.img,
            -icon.width / 2, // Offset to center the image
            -icon.height / 2,
            icon.width,
            icon.height
        );

        ctx.restore(); // Restore the previous canvas state

        // Move icons
        icon.x += icon.speedX;
        icon.y += icon.speedY;

        // Rotate icons
        icon.rotation += icon.rotationSpeed;

        // Wrap icons around the edges
        if (icon.x > canvas.width) icon.x = -icon.width;
        if (icon.x + icon.width < 0) icon.x = canvas.width;
        if (icon.y > canvas.height) icon.y = -icon.height;
        if (icon.y + icon.height < 0) icon.y = canvas.height;
    });

    requestAnimationFrame(drawScene);
}

// Event listener to resize canvas
window.addEventListener('resize', resizeCanvas);

// Initialize and animate
resizeCanvas();
initializeStars();
initializeObjects();
drawScene();