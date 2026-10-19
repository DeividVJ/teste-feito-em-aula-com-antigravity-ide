// DoomXP.js - Port 1:1 exato de DoomXP.cs
// Resolução: 320x240 (escala para 640x480) | 30 FPS | Raycaster DDA

class SpriteItem {
    constructor(X, Y, t, a, h) {
        this.x = X;
        this.y = Y;
        this.type = t; // 1: Enemy, 2: Health, 3: Armor, 4: Ammo
        this.active = a;
        this.hp = h;
        this.dist = 0;
        
        this.screenX = 0;
        this.width = 0;
        this.transformY = 0;

        this.actionCooldown = 0; // Cooldown de ataque
        this.respawnTimer = 0;
    }
}

// Stats e Variáveis exatamente como em DoomXP.cs
let buffer;
let bg;
let displayCanvas;
let displayCtx;

let enemyTex;
let healthTex;
let armorTex;
let ammoTex;
let weaponTex;

// Raycaster stats
let posX = 2.5, posY = 2.5;
let dirX = -1, dirY = 0;
let planeX = 0, planeY = 0.66;

let moveSpeed = 0.2;
let rotSpeed = 0.1;

let kUp = false, kDown = false, kLeft = false, kRight = false, kShoot = false;

const screenWidth = 320;
const screenHeight = 240; // 200 for 3D view, 40 for HUD

// Z-Buffer for sprites
let ZBuffer = new Float64Array(screenWidth);

// Player Stats
let pHealth = 100;
let pArmor = 0;
let pAmmo = 50;
let shootCooldown = 0;

let sprites = [];

const map = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,1,1,1,1,1,0,0,1],
    [1,1,0,1,1,1,1,1,0,0,0,1,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
    [1,1,0,1,1,1,1,1,0,0,0,1,1,0,1],
    [1,0,0,0,0,0,0,1,1,0,1,1,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,1,1,0,1,1,0,0,1],
    [1,0,0,0,0,0,0,1,1,0,1,1,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

function ScaleImage(img, width, height) {
    let b = document.createElement('canvas');
    b.width = width;
    b.height = height;
    let g = b.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(img, 0, 0, width, height);
    return b;
}

function loadTexture(src, width, height, fallbackCreator) {
    let img = new Image();
    let holder = { current: fallbackCreator() };
    img.onload = function() {
        holder.current = ScaleImage(img, width, height);
    };
    img.src = src;
    return holder;
}

function initGame() {
    displayCanvas = document.getElementById('gameCanvas');
    displayCtx = displayCanvas.getContext('2d');
    displayCtx.imageSmoothingEnabled = false;

    // Buffer offscreen (320x240)
    buffer = document.createElement('canvas');
    buffer.width = screenWidth;
    buffer.height = screenHeight;
    bg = buffer.getContext('2d');
    bg.imageSmoothingEnabled = false;

    // Load images com fallback exato de DoomXP.cs
    enemyTex = loadTexture('img/png-clipart-doom-ii-doom-rpg-doom-3-cyberdemon-doom-game-boss-thumbnail.png', 64, 64, function() {
        let b = document.createElement('canvas');
        b.width = 64; b.height = 64;
        let g = b.getContext('2d');
        g.fillStyle = 'red';
        g.fillRect(0, 0, 64, 64);
        g.fillStyle = 'black';
        g.fillRect(10, 10, 10, 10);
        g.fillRect(44, 10, 10, 10);
        return b;
    });

    healthTex = loadTexture('img/png-clipart-doom-ii-brutal-doom-master-chief-others-video-game-expansion-pack-thumbnail.png', 64, 64, function() {
        let b = document.createElement('canvas');
        b.width = 1; b.height = 1;
        return b;
    });

    armorTex = loadTexture('img/brutal-doom.png', 64, 64, function() {
        let b = document.createElement('canvas');
        b.width = 1; b.height = 1;
        return b;
    });

    ammoTex = loadTexture('img/png-clipart-doom-3-doom-64-doom-ii-doom-video-game-fictional-character-thumbnail.png', 64, 64, function() {
        let b = document.createElement('canvas');
        b.width = 1; b.height = 1;
        return b;
    });

    weaponTex = loadTexture('img/png-clipart-doom-ii-doom-64-doom-3-wolfenstein-3d-doom-video-game-fictional-character-thumbnail.png', 400, 300, function() {
        let b = document.createElement('canvas');
        b.width = 1; b.height = 1;
        return b;
    });

    // Populate items and enemies (exatamente linhas 120-129)
    sprites.push(new SpriteItem( 2.5,  6.5, 1, true, 100 ));
    sprites.push(new SpriteItem( 6.5,  6.5, 1, true, 100 ));
    sprites.push(new SpriteItem( 5.5, 12.5, 1, true, 100 ));
    sprites.push(new SpriteItem( 12.5, 6.5, 1, true, 100 ));
    sprites.push(new SpriteItem( 9.5,  2.5, 1, true, 100 ));
    sprites.push(new SpriteItem( 2.5,  9.5, 1, true, 100 ));
    sprites.push(new SpriteItem( 1.5,  1.5, 2, true, 0 ));
    sprites.push(new SpriteItem( 12.5, 2.5, 3, true, 0 ));
    sprites.push(new SpriteItem( 8.5, 10.5, 4, true, 0 ));
    sprites.push(new SpriteItem( 9.5, 10.5, 4, true, 0 ));

    // Controles de teclado idênticos (linhas 136-150)
    window.addEventListener('keydown', function(ev) {
        let code = ev.code;
        if (code === 'KeyW' || code === 'ArrowUp') kUp = true;
        if (code === 'KeyS' || code === 'ArrowDown') kDown = true;
        if (code === 'KeyA' || code === 'ArrowLeft') kLeft = true;
        if (code === 'KeyD' || code === 'ArrowRight') kRight = true;
        if (code === 'Space') { kShoot = true; ev.preventDefault(); }
    });

    window.addEventListener('keyup', function(ev) {
        let code = ev.code;
        if (code === 'KeyW' || code === 'ArrowUp') kUp = false;
        if (code === 'KeyS' || code === 'ArrowDown') kDown = false;
        if (code === 'KeyA' || code === 'ArrowLeft') kLeft = false;
        if (code === 'KeyD' || code === 'ArrowRight') kRight = false;
        if (code === 'Space') kShoot = false;
    });

    // Loop a 30 FPS exatos (timer.Interval = 1000 / 30)
    setInterval(MainLoop, 1000 / 30);
}

function MainLoop() {
    if (pHealth <= 0) {
        RenderSpace();
        return; // Game over freeze
    }

    // Input processing
    if (kUp) {
        let nextX = Math.trunc(posX + dirX * moveSpeed * 1.5);
        let nextY = Math.trunc(posY + dirY * moveSpeed * 1.5);
        if (nextX >= 0 && nextX < 15) {
            if (map[nextX][Math.trunc(posY)] === 0) posX += dirX * moveSpeed;
        }
        if (nextY >= 0 && nextY < 15) {
            if (map[Math.trunc(posX)][nextY] === 0) posY += dirY * moveSpeed;
        }
    }
    if (kDown) {
        let nextX = Math.trunc(posX - dirX * moveSpeed * 1.5);
        let nextY = Math.trunc(posY - dirY * moveSpeed * 1.5);
        if (nextX >= 0 && nextX < 15) {
            if (map[nextX][Math.trunc(posY)] === 0) posX -= dirX * moveSpeed;
        }
        if (nextY >= 0 && nextY < 15) {
            if (map[Math.trunc(posX)][nextY] === 0) posY -= dirY * moveSpeed;
        }
    }
    if (kRight) {
        let oldDirX = dirX;
        dirX = dirX * Math.cos(-rotSpeed) - dirY * Math.sin(-rotSpeed);
        dirY = oldDirX * Math.sin(-rotSpeed) + dirY * Math.cos(-rotSpeed);
        let oldPlaneX = planeX;
        planeX = planeX * Math.cos(-rotSpeed) - planeY * Math.sin(-rotSpeed);
        planeY = oldPlaneX * Math.sin(-rotSpeed) + planeY * Math.cos(-rotSpeed);
    }
    if (kLeft) {
        let oldDirX = dirX;
        dirX = dirX * Math.cos(rotSpeed) - dirY * Math.sin(rotSpeed);
        dirY = oldDirX * Math.sin(rotSpeed) + dirY * Math.cos(rotSpeed);
        let oldPlaneX = planeX;
        planeX = planeX * Math.cos(rotSpeed) - planeY * Math.sin(rotSpeed);
        planeY = oldPlaneX * Math.sin(rotSpeed) + planeY * Math.cos(rotSpeed);
    }

    if (shootCooldown > 0) shootCooldown--;

    if (kShoot && shootCooldown === 0 && pAmmo > 0) {
        shootCooldown = 15;
        pAmmo--;
        
        // Shoot logic: check if any enemy is near center of screen
        for (let i = 0; i < sprites.length; i++) {
            let sp = sprites[i];
            if (sp.active && sp.type === 1 && sp.transformY > 0) {
                // sp.screenX is Where the center of the enemy is on the screen X
                if (Math.abs(sp.screenX - (screenWidth / 2)) < (sp.width / 2) + 20) {
                    if (sp.transformY < 10) { // range limit
                        sp.hp -= 35;
                        if (sp.hp <= 0) {
                            sp.active = false;
                            sp.respawnTimer = 150; // 5 segundos
                        }
                    }
                }
            }
        }
    }

    // Pickup items & Enemy AI
    for (let i = 0; i < sprites.length; i++) {
        let sp = sprites[i];
        if (!sp.active) {
            if (sp.type === 1) {
                if (sp.respawnTimer > 0) sp.respawnTimer--;
                else {
                    let rx, ry;
                    do {
                        rx = Math.floor(Math.random() * 13) + 1; // 1 to 13 (rnd.Next(1, 14))
                        ry = Math.floor(Math.random() * 13) + 1;
                    } while (map[rx][ry] !== 0 || (Math.abs(rx - posX) < 3 && Math.abs(ry - posY) < 3));
                    sp.x = rx + 0.5;
                    sp.y = ry + 0.5;
                    sp.hp = 100;
                    sp.active = true;
                }
            }
            continue;
        }
        
        let dist = Math.sqrt((posX - sp.x) * (posX - sp.x) + (posY - sp.y) * (posY - sp.y));
        
        // --- INIMIGOS: Inteligencia Artificial ---
        if (sp.type === 1 && sp.hp > 0) {
            if (sp.actionCooldown > 0) sp.actionCooldown--;
            
            if (dist > 0.6 && dist < 8.0) {
                // Perseguir o jogador (velocidade reduzida para dar tempo ao jogador)
                let moveX = ((posX - sp.x) / dist) * 0.05;
                let moveY = ((posY - sp.y) / dist) * 0.05;
                
                // Checar paredes no eixo X
                let tryX = Math.trunc(sp.x + moveX);
                let tryY = Math.trunc(sp.y);
                if (tryX >= 0 && tryX < 15 && tryY >= 0 && tryY < 15 && map[tryX][tryY] === 0) {
                    sp.x += moveX;
                }
                
                // Checar paredes no eixo Y
                tryX = Math.trunc(sp.x);
                tryY = Math.trunc(sp.y + moveY);
                if (tryX >= 0 && tryX < 15 && tryY >= 0 && tryY < 15 && map[tryX][tryY] === 0) {
                    sp.y += moveY;
                }
            }
            else if (dist <= 0.6) {
                // Se aproximou do jogador, ataca e usa cooldown
                if (sp.actionCooldown <= 0) {
                    if (pArmor > 0) pArmor -= 10;
                    else pHealth -= 10;
                    
                    if (pArmor < 0) { 
                        pHealth += pArmor; // subtrai o excesso da vida
                        pArmor = 0; 
                    }
                    sp.actionCooldown = 30; // Aguardar 1 segundo (30 frames) para atacar de novo
                }
            }
        }

        // --- COLETA DE ITENS ---
        if (dist < 0.6) {
            if (sp.type === 2 && pHealth < 100) { pHealth += 25; if (pHealth > 100) pHealth = 100; sp.active = false; }
            if (sp.type === 3 && pArmor < 100) { pArmor += 50; if (pArmor > 100) pArmor = 100; sp.active = false; }
            if (sp.type === 4) { pAmmo += 15; sp.active = false; }
        }
    }

    RenderSpace();
}

function RenderSpace() {
    bg.fillStyle = 'black';
    bg.fillRect(0, 0, screenWidth, screenHeight);
    
    let viewHeight = screenHeight - 40; // leaving 40 for bottom dashboard
    
    // Draw sky/floor
    bg.fillStyle = 'darkgray';
    bg.fillRect(0, viewHeight / 2, screenWidth, viewHeight / 2);
    bg.fillStyle = 'darkblue';
    bg.fillRect(0, 0, screenWidth, viewHeight / 2);

    // WALL CASTING
    for (let x = 0; x < screenWidth; x++) {
        let cameraX = 2 * x / screenWidth - 1;
        let rayDirX = dirX + planeX * cameraX;
        let rayDirY = dirY + planeY * cameraX;

        let mapX = Math.trunc(posX);
        let mapY = Math.trunc(posY);

        let sideDistX;
        let sideDistY;

        let deltaDistX = Math.abs(1 / rayDirX);
        let deltaDistY = Math.abs(1 / rayDirY);
        let perpWallDist;

        let stepX;
        let stepY;

        let hit = 0;
        let side = 0; 

        if (rayDirX < 0) {
            stepX = -1;
            sideDistX = (posX - mapX) * deltaDistX;
        } else {
            stepX = 1;
            sideDistX = (mapX + 1.0 - posX) * deltaDistX;
        }

        if (rayDirY < 0) {
            stepY = -1;
            sideDistY = (posY - mapY) * deltaDistY;
        } else {
            stepY = 1;
            sideDistY = (mapY + 1.0 - posY) * deltaDistY;
        }

        while (hit === 0) {
            if (sideDistX < sideDistY) {
                sideDistX += deltaDistX;
                mapX += stepX;
                side = 0;
            } else {
                sideDistY += deltaDistY;
                mapY += stepY;
                side = 1;
            }

            if (mapX >= 0 && mapY >= 0 && mapX < 15 && mapY < 15) {
                if (map[mapX][mapY] > 0) hit = map[mapX][mapY];
            } else {
                hit = 1; 
            }
        }

        if (side === 0) perpWallDist = (mapX - posX + (1 - stepX) / 2) / rayDirX;
        else           perpWallDist = (mapY - posY + (1 - stepY) / 2) / rayDirY;

        if (perpWallDist === 0) perpWallDist = 0.01;
        ZBuffer[x] = perpWallDist;

        let lineHeight = Math.trunc(viewHeight / perpWallDist);

        let drawStart = Math.trunc(-lineHeight / 2 + viewHeight / 2);
        if (drawStart < 0) drawStart = 0;
        let drawEnd = Math.trunc(lineHeight / 2 + viewHeight / 2);
        if (drawEnd >= viewHeight) drawEnd = viewHeight - 1;

        // Color c = Color.Gray; if(hit == 1) c = Color.DarkRed; if(side == 1) c = Color.FromArgb(c.R / 2, c.G / 2, c.B / 2);
        // Color.DarkRed = RGB(139, 0, 0)
        let c = 'rgb(139, 0, 0)';
        if (hit !== 1) c = 'gray';

        if (side === 1) {
            if (hit === 1) c = 'rgb(69, 0, 0)'; // 139 / 2 = 69
            else c = 'rgb(64, 64, 64)';
        }

        bg.fillStyle = c;
        bg.fillRect(x, drawStart, 1, drawEnd - drawStart);
    }

    // SPRITE CASTING
    for (let i = 0; i < sprites.length; i++) {
        sprites[i].dist = ((posX - sprites[i].x) * (posX - sprites[i].x) + (posY - sprites[i].y) * (posY - sprites[i].y));
    }
    sprites.sort(function(a, b) { return b.dist - a.dist; });

    let invDet = 1.0 / (planeX * dirY - dirX * planeY); 

    for (let i = 0; i < sprites.length; i++) {
        let sp = sprites[i];
        if (!sp.active) continue;

        let spriteX = sp.x - posX;
        let spriteY = sp.y - posY;

        let transformX = invDet * (dirY * spriteX - dirX * spriteY);
        let transformY = invDet * (-planeY * spriteX + planeX * spriteY);

        sp.transformY = transformY;

        if (transformY > 0.05) { // Ensure it's in front and avoid zero div
            let spriteScreenX = Math.trunc((screenWidth / 2) * (1 + transformX / transformY));
            sp.screenX = spriteScreenX;

            let fHeight = viewHeight / transformY;
            if (fHeight > screenHeight * 10) fHeight = screenHeight * 10;
            let spriteHeight = Math.trunc(fHeight);

            let drawStartY = Math.trunc(-spriteHeight / 2 + viewHeight / 2);
            if (drawStartY < 0) drawStartY = 0;
            let drawEndY = Math.trunc(spriteHeight / 2 + viewHeight / 2);
            if (drawEndY >= viewHeight) drawEndY = viewHeight - 1;

            let fWidth = viewHeight / transformY;
            if (fWidth > screenWidth * 10) fWidth = screenWidth * 10;
            let spriteWidth = Math.trunc(fWidth);
            sp.width = spriteWidth;

            let drawStartX = Math.trunc(-spriteWidth / 2 + spriteScreenX);
            if (drawStartX < 0) drawStartX = 0;
            let drawEndX = Math.trunc(spriteWidth / 2 + spriteScreenX);
            if (drawEndX >= screenWidth) drawEndX = screenWidth - 1;

            let eImg = enemyTex.current;
            let hImg = healthTex.current;
            let aImg = armorTex.current;
            let amImg = ammoTex.current;

            for (let stripe = drawStartX; stripe < drawEndX; stripe++) {
                let texX = Math.trunc(Math.trunc(256 * (stripe - (-spriteWidth / 2 + spriteScreenX)) * eImg.width / spriteWidth) / 256);
                
                if (transformY < ZBuffer[stripe]) {
                    if (sp.type === 1) {
                        bg.drawImage(eImg, texX, 0, 1, eImg.height, stripe, drawStartY, 1, drawEndY - drawStartY);
                    } else if (sp.type === 2) {
                        if (hImg.width > 1) {
                            let tX = Math.trunc(Math.trunc(256 * (stripe - (-spriteWidth / 2 + spriteScreenX)) * hImg.width / spriteWidth) / 256);
                            bg.drawImage(hImg, tX, 0, 1, hImg.height, stripe, drawStartY, 1, drawEndY - drawStartY);
                        } else {
                            bg.fillStyle = 'white';
                            bg.fillRect(stripe, drawStartY + spriteHeight / 2, 1, spriteHeight / 2);
                        }
                    } else if (sp.type === 3) {
                        if (aImg.width > 1) {
                            let tX = Math.trunc(Math.trunc(256 * (stripe - (-spriteWidth / 2 + spriteScreenX)) * aImg.width / spriteWidth) / 256);
                            bg.drawImage(aImg, tX, 0, 1, aImg.height, stripe, drawStartY, 1, drawEndY - drawStartY);
                        } else {
                            bg.fillStyle = 'green';
                            bg.fillRect(stripe, drawStartY + spriteHeight / 2, 1, spriteHeight / 2);
                        }
                    } else if (sp.type === 4) {
                        if (amImg.width > 1) {
                            let tX = Math.trunc(Math.trunc(256 * (stripe - (-spriteWidth / 2 + spriteScreenX)) * amImg.width / spriteWidth) / 256);
                            bg.drawImage(amImg, tX, 0, 1, amImg.height, stripe, drawStartY, 1, drawEndY - drawStartY);
                        } else {
                            bg.fillStyle = 'blue';
                            bg.fillRect(stripe, drawStartY + spriteHeight / 2, 1, spriteHeight / 2);
                        }
                    }
                }
            }
        }
    }

    // WEAPON
    let wImg = weaponTex.current;
    let bw = 40;
    let bh = 100;
    if (wImg.width > 1) {
        bw = wImg.width;
        bh = wImg.height;
        let scale = viewHeight / bh;
        bw = Math.trunc(bw * scale);
        bh = Math.trunc(bh * scale);
    }
    let bOffset = 0;
    if (kUp || kDown) bOffset = Math.trunc(Math.sin(Date.now() / 100.0) * 10); // view bobbing
    
    if (shootCooldown > 10) {
        bg.fillStyle = 'yellow';
        bg.beginPath();
        bg.arc(screenWidth / 2 - 30 + bOffset + 30, viewHeight - bh - 30 + 30, 30, 0, Math.PI * 2);
        bg.fill();
    }
    
    if (wImg.width > 1) {
        bg.drawImage(wImg, screenWidth / 2 - bw / 2 + bOffset, viewHeight - bh, bw, bh);
    } else {
        // basic shotgun fallback
        bw = 40; bh = 100;
        bg.fillStyle = 'dimgray';
        bg.fillRect(screenWidth / 2 - bw / 2 + bOffset, viewHeight - bh, bw, bh);
        bg.fillStyle = 'black';
        bg.fillRect(screenWidth / 2 - bw / 4 + bOffset, viewHeight - bh + 10, bw / 2, 20); // barrel hole
    }

    // HUD
    bg.fillStyle = 'gray';
    bg.fillRect(0, viewHeight, screenWidth, 40);
    bg.fillStyle = 'dimgray';
    bg.fillRect(5, viewHeight + 5, screenWidth - 10, 30);
    
    bg.font = '12px Impact';
    bg.textBaseline = 'top';
    bg.fillStyle = pHealth <= 20 ? 'red' : 'white';
    bg.fillText('HP: ' + pHealth + '%', 10, viewHeight + 8);
    
    bg.fillStyle = 'lightgreen';
    bg.fillText('ARM: ' + pArmor + '%', 90, viewHeight + 8);

    bg.fillStyle = 'yellow';
    bg.fillText('AMMO: ' + pAmmo, 200, viewHeight + 8);

    if (pHealth <= 0) {
        bg.font = '36px Impact';
        bg.fillStyle = 'darkred';
        bg.fillText('VOCE MORREU!', screenWidth / 2 - 140, viewHeight / 2 - 30);
    }

    // OnPaint: desenha o buffer escalado para ClientSize (640x480)
    displayCtx.drawImage(buffer, 0, 0, displayCanvas.width, displayCanvas.height);
}

window.addEventListener('DOMContentLoaded', initGame);
