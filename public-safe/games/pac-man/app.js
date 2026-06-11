document.addEventListener("DOMContentLoaded", () => {
    const scoreDisplay = document.getElementById("score")
    const width = 28
    let score = 0
    const grid = document.querySelector(".grid")

    const layout = [
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
        1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1,
        1, 3, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 3, 1,
        1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1,
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
        1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1,
        1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1,
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
        1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 0, 1, 1, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 1, 1, 0, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 0, 1, 1, 4, 1, 1, 1, 2, 2, 1, 1, 1, 4, 1, 1, 0, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 0, 1, 1, 4, 1, 2, 2, 2, 2, 2, 2, 1, 4, 1, 1, 0, 1, 1, 1, 1, 1, 1,
        4, 4, 4, 4, 4, 4, 0, 0, 0, 4, 1, 2, 2, 2, 2, 2, 2, 1, 4, 0, 0, 0, 4, 4, 4, 4, 4, 4,
        1, 1, 1, 1, 1, 1, 0, 1, 1, 4, 1, 2, 2, 2, 2, 2, 2, 1, 4, 1, 1, 0, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 0, 1, 1, 4, 1, 1, 1, 1, 1, 1, 1, 1, 4, 1, 1, 0, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 0, 1, 1, 4, 1, 1, 1, 1, 1, 1, 1, 1, 4, 1, 1, 0, 1, 1, 1, 1, 1, 1,
        1, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 1,
        1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1,
        1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1,
        1, 3, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 3, 1,
        1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1,
        1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1,
        1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1,
        1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1,
        1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1,
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1
    ]

    // 0 - pac-dots
    // 1 - wall
    // 2 - ghost-lair
    // 3 - power-pellet
    // 4 - empty

    const squares = []
    let gameOver = false

    //create your board
    function createBoard() {
        for (let i = 0; i < layout.length; i++) {
            const square = document.createElement("div")
            square.id = i
            grid.appendChild(square)
            squares.push(square)

            //add layout to the board
            if (layout[i] === 0) {
                squares[i].classList.add("pac-dot")
            }
            if (layout[i] === 1) {
                squares[i].classList.add("wall")
            }
            if (layout[i] === 2) {
                squares[i].classList.add("ghost-lair")
            }
            if (layout[i] === 3) {
                squares[i].classList.add("power-pellet")
            }
        }
    }
    createBoard()

    //create Characters
    // draw pac-man onto the board
    let pacmanCurrentIndex = 490
    squares[pacmanCurrentIndex].classList.add("pac-man")

    // Teleport tunnel mapping
    function teleportCheck(index) {
        // Left tunnel (363 → 391)
        if (index === 363) return 391
        // Right tunnel (392 → 364)
        if (index === 392) return 364
        return index
    }

    //move pacman
    function movePacman(e) {
        if (gameOver) return
        squares[pacmanCurrentIndex].classList.remove("pac-man")
        switch (e.key) {
            case "ArrowLeft":
                if (
                    pacmanCurrentIndex % width !== 0 &&
                    !squares[pacmanCurrentIndex - 1].classList.contains("wall") &&
                    !squares[pacmanCurrentIndex - 1].classList.contains("ghost-lair")
                ) {
                    pacmanCurrentIndex -= 1
                }
                pacmanCurrentIndex = teleportCheck(pacmanCurrentIndex)
                break
            case "ArrowUp":
                if (
                    pacmanCurrentIndex - width >= 0 &&
                    !squares[pacmanCurrentIndex - width].classList.contains("wall") &&
                    !squares[pacmanCurrentIndex - width].classList.contains("ghost-lair")
                ) {
                    pacmanCurrentIndex -= width
                }
                break
            case "ArrowRight":
                if (
                    pacmanCurrentIndex % width < width - 1 &&
                    !squares[pacmanCurrentIndex + 1].classList.contains("wall") &&
                    !squares[pacmanCurrentIndex + 1].classList.contains("ghost-lair")
                ) {
                    pacmanCurrentIndex += 1
                }
                pacmanCurrentIndex = teleportCheck(pacmanCurrentIndex)
                break
            case "ArrowDown":
                if (
                    pacmanCurrentIndex + width < width * width &&
                    !squares[pacmanCurrentIndex + width].classList.contains("wall") &&
                    !squares[pacmanCurrentIndex + width].classList.contains("ghost-lair")
                ) {
                    pacmanCurrentIndex += width
                }
                break
        }
        squares[pacmanCurrentIndex].classList.add("pac-man")
        pacDotEaten()
        powerPelletEaten()
        checkForGameOver()
        checkForWin()
    }

    document.addEventListener("keyup", movePacman)

    // Touch D-Pad controls
    const dpad = document.getElementById("dpad")
    if (dpad) {
        dpad.addEventListener("click", (e) => {
            const btn = e.target.closest(".dpad-btn")
            if (!btn) return
            const dir = btn.getAttribute("data-dir")
            if (dir) movePacman({ key: dir })
        })
        // Touch start visual feedback
        dpad.addEventListener("touchstart", (e) => {
            const btn = e.target.closest(".dpad-btn")
            if (btn) btn.classList.add("active")
        }, { passive: true })
        dpad.addEventListener("touchend", (e) => {
            const btn = e.target.closest(".dpad-btn")
            if (btn) btn.classList.remove("active")
        }, { passive: true })
    }

    //what happens when you eat a pac-dot
    function pacDotEaten() {
        if (squares[pacmanCurrentIndex].classList.contains("pac-dot")) {
            score++
            scoreDisplay.textContent = String(score)
            squares[pacmanCurrentIndex].classList.remove("pac-dot")
        }
    }

    //what happens when you eat a power-pellet
    function powerPelletEaten() {
        if (squares[pacmanCurrentIndex].classList.contains("power-pellet")) {
            score += 10
            scoreDisplay.textContent = String(score)
            ghosts.forEach(ghost => ghost.isScared = true)
            setTimeout(unScareGhosts, 10000)
            squares[pacmanCurrentIndex].classList.remove("power-pellet")
        }
    }

    //make the ghosts stop flashing
    function unScareGhosts() {
        ghosts.forEach(ghost => ghost.isScared = false)
    }

    //create ghosts using Constructor
    class Ghost {
        constructor(className, startIndex, speed) {
            this.className = className
            this.startIndex = startIndex
            this.speed = speed
            this.currentIndex = startIndex
            this.isScared = false
            this.timerId = NaN

        }
    }

    //all my ghosts
    const ghosts = [
        new Ghost("blinky", 348, 250),
        new Ghost("pinky", 376, 400),
        new Ghost("inky", 351, 300),
        new Ghost("clyde", 379, 500),
    ]

    //draw my ghosts onto the grid
    ghosts.forEach(ghost =>
        squares[ghost.currentIndex].classList.add(ghost.className, "ghost"))

    //move ghosts randomly
    ghosts.forEach(ghost => moveGhost(ghost))

    function moveGhost(ghost) {
        const directions = [-1, 1, width, -width]
        let direction = directions[Math.floor(Math.random() * directions.length)]
        // Determine valid ghost home cells (the 4 center cells directly above ghost lair entrance)
        const ghostHomeIdx = ghost.startIndex

        ghost.timerId = setInterval(function () {
            if (gameOver) return
            // Check if next square is valid
            const nextIdx = ghost.currentIndex + direction
            const isGhostLair = squares[nextIdx]?.classList.contains("ghost-lair")
            const isWall = squares[nextIdx]?.classList.contains("wall")
            const hasGhost = squares[nextIdx]?.classList.contains("ghost")

            // Allow movement into ghost lair only from above (returning home)
            const isEnteringLair = isGhostLair && (
                squares[ghost.currentIndex + direction - width]?.classList.contains("ghost-lair") ||
                direction === width
            )

            if (
                nextIdx >= 0 &&
                nextIdx < squares.length &&
                !isWall &&
                !hasGhost &&
                (!isGhostLair || isEnteringLair)
            ) {
                squares[ghost.currentIndex].classList.remove(ghost.className, "ghost", "scared-ghost")
                ghost.currentIndex = nextIdx
                squares[ghost.currentIndex].classList.add(ghost.className, "ghost")
            } else {
                direction = directions[Math.floor(Math.random() * directions.length)]
            }

            if (ghost.isScared) {
                squares[ghost.currentIndex].classList.add("scared-ghost")
            }

            //if the ghost is currently scared and pacman is on it
            if (ghost.isScared && squares[ghost.currentIndex].classList.contains("pac-man")) {
                ghost.isScared = false
                squares[ghost.currentIndex].classList.remove(ghost.className, "ghost", "scared-ghost")
                ghost.currentIndex = ghost.startIndex
                score += 100
                scoreDisplay.textContent = String(score)
                squares[ghost.currentIndex].classList.add(ghost.className, "ghost")
            }
            checkForGameOver()
        }, ghost.speed)
    }

    //check for a game over
    function checkForGameOver() {
        if (gameOver) return
        if (
            squares[pacmanCurrentIndex].classList.contains("ghost") &&
            !squares[pacmanCurrentIndex].classList.contains("scared-ghost")) {
            gameOver = true
            ghosts.forEach(ghost => clearInterval(ghost.timerId))
            document.removeEventListener("keyup", movePacman)
            setTimeout(function () {
                alert("Game Over")
                location.reload()
            }, 500)
        }
    }

    //check for a win - change the winning score to whatever you wish
    function checkForWin() {
        if (score >= 274) {
            gameOver = true
            ghosts.forEach(ghost => clearInterval(ghost.timerId))
            document.removeEventListener("keyup", movePacman)
            setTimeout(function () {
                alert("You have WON!")
                location.reload()
            }, 500)
        }
    }
})
