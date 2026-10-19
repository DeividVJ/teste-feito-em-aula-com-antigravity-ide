using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;
using System.Collections.Generic;

namespace DoomClone
{
    public class SpriteItem 
    {
        public double x, y;
        public int type; // 1: Enemy, 2: Health, 3: Armor, 4: Ammo
        public bool active;
        public double dist;
        public int hp;
        
        public int screenX;
        public int width;
        public double transformY;

        public int actionCooldown; // NEW: Cooldown de ataque
        public int respawnTimer;

        public SpriteItem(double X, double Y, int t, bool a, int h) {
            this.x = X; this.y = Y; this.type = t; this.active = a; this.hp = h;
            this.actionCooldown = 0;
            this.respawnTimer = 0;
        }
    }

    public class GameForm : Form
    {
        private Timer timer;
        private Bitmap buffer;
        private Graphics bg;
        private Image enemyTex;
        private Image healthTex;
        private Image armorTex;
        private Image ammoTex;
        private Image weaponTex;
        
        // Raycaster stats
        double posX = 2.5, posY = 2.5;
        double dirX = -1, dirY = 0;
        double planeX = 0, planeY = 0.66;
        
        double moveSpeed = 0.2;
        double rotSpeed = 0.1;

        bool kUp, kDown, kLeft, kRight, kShoot;

        int screenWidth = 320;
        int screenHeight = 240; // 200 for 3D view, 40 for HUD

        // Z-Buffer for sprites
        double[] ZBuffer;

        // Player Stats
        int pHealth = 100;
        int pArmor = 0;
        int pAmmo = 50;
        int shootCooldown = 0;

        List<SpriteItem> sprites = new List<SpriteItem>();
        Random rnd = new Random();

        int[,] map = new int[,]
        {
            {1,1,1,1,1,1,1,1,1,1,1,1,1,1,1},
            {1,0,0,0,0,1,0,0,0,0,0,0,0,0,1},
            {1,0,0,0,0,1,0,0,0,0,0,0,0,0,1},
            {1,0,0,0,0,0,0,1,1,1,1,1,0,0,1},
            {1,1,0,1,1,1,1,1,0,0,0,1,0,0,1},
            {1,0,0,0,0,0,0,0,0,0,0,1,0,0,1},
            {1,0,0,0,0,0,0,0,0,0,0,0,0,0,1},
            {1,0,0,0,0,0,0,0,0,0,0,1,0,0,1},
            {1,1,0,1,1,1,1,1,0,0,0,1,1,0,1},
            {1,0,0,0,0,0,0,1,1,0,1,1,0,0,1},
            {1,0,0,0,0,0,0,0,0,0,0,0,0,0,1},
            {1,0,0,0,0,0,0,0,0,0,0,0,0,0,1},
            {1,0,0,0,0,0,0,1,1,0,1,1,0,0,1},
            {1,0,0,0,0,0,0,1,1,0,1,1,0,0,1},
            {1,1,1,1,1,1,1,1,1,1,1,1,1,1,1}
        };

        private Image ScaleImage(Image img, int width, int height) {
            Bitmap b = new Bitmap(width, height);
            using(Graphics g = Graphics.FromImage(b)) {
                g.InterpolationMode = InterpolationMode.NearestNeighbor;
                g.DrawImage(img, 0, 0, width, height);
            }
            return b;
        }

        public GameForm()
        {
            this.Text = "Doom XP - Full Engine";
            this.ClientSize = new Size(screenWidth * 2, screenHeight * 2);
            this.DoubleBuffered = true;
            this.SetStyle(ControlStyles.OptimizedDoubleBuffer | ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint, true);

            buffer = new Bitmap(screenWidth, screenHeight);
            bg = Graphics.FromImage(buffer);
            bg.InterpolationMode = InterpolationMode.NearestNeighbor;
            ZBuffer = new double[screenWidth];

            // Load images
            try { enemyTex = ScaleImage(Image.FromFile(@"img\png-clipart-doom-ii-doom-rpg-doom-3-cyberdemon-doom-game-boss-thumbnail.png"), 64, 64); } catch {
                enemyTex = new Bitmap(64, 64);
                using(Graphics g = Graphics.FromImage(enemyTex)) {
                    g.Clear(Color.Red); g.FillRectangle(Brushes.Black, 10, 10, 10, 10); g.FillRectangle(Brushes.Black, 44, 10, 10, 10);
                }
            }
            try { healthTex = ScaleImage(Image.FromFile(@"img\png-clipart-doom-ii-brutal-doom-master-chief-others-video-game-expansion-pack-thumbnail.png"), 64, 64); } catch { healthTex = new Bitmap(1,1); }
            try { armorTex = ScaleImage(Image.FromFile(@"img\brutal-doom.png"), 64, 64); } catch { armorTex = new Bitmap(1,1); }
            try { ammoTex = ScaleImage(Image.FromFile(@"img\png-clipart-doom-3-doom-64-doom-ii-doom-video-game-fictional-character-thumbnail.png"), 64, 64); } catch { ammoTex = new Bitmap(1,1); }
            try { weaponTex = ScaleImage(Image.FromFile(@"img\png-clipart-doom-ii-doom-64-doom-3-wolfenstein-3d-doom-video-game-fictional-character-thumbnail.png"), 400, 300); } catch { weaponTex = new Bitmap(1,1); }

            // Populate items and enemies
            sprites.Add(new SpriteItem( 2.5,  6.5, 1, true, 100 ));
            sprites.Add(new SpriteItem( 6.5,  6.5, 1, true, 100 ));
            sprites.Add(new SpriteItem( 5.5, 12.5, 1, true, 100 ));
            sprites.Add(new SpriteItem( 12.5, 6.5, 1, true, 100 ));
            sprites.Add(new SpriteItem( 9.5,  2.5, 1, true, 100 ));
            sprites.Add(new SpriteItem( 2.5,  9.5, 1, true, 100 ));
            sprites.Add(new SpriteItem( 1.5,  1.5, 2, true, 0 ));
            sprites.Add(new SpriteItem( 12.5, 2.5, 3, true, 0 ));
            sprites.Add(new SpriteItem( 8.5, 10.5, 4, true, 0 ));
            sprites.Add(new SpriteItem( 9.5, 10.5, 4, true, 0 ));

            timer = new Timer();
            timer.Interval = 1000 / 30; // 30 FPS
            timer.Tick += MainLoop;
            timer.Start();

            this.KeyDown += delegate(object s, KeyEventArgs ev) {
                if (ev.KeyCode == Keys.W || ev.KeyCode == Keys.Up) kUp = true;
                if (ev.KeyCode == Keys.S || ev.KeyCode == Keys.Down) kDown = true;
                if (ev.KeyCode == Keys.A || ev.KeyCode == Keys.Left) kLeft = true;
                if (ev.KeyCode == Keys.D || ev.KeyCode == Keys.Right) kRight = true;
                if (ev.KeyCode == Keys.Space) kShoot = true;
                if (ev.KeyCode == Keys.Escape) this.Close();
            };
            this.KeyUp += delegate(object s, KeyEventArgs ev) {
                if (ev.KeyCode == Keys.W || ev.KeyCode == Keys.Up) kUp = false;
                if (ev.KeyCode == Keys.S || ev.KeyCode == Keys.Down) kDown = false;
                if (ev.KeyCode == Keys.A || ev.KeyCode == Keys.Left) kLeft = false;
                if (ev.KeyCode == Keys.D || ev.KeyCode == Keys.Right) kRight = false;
                if (ev.KeyCode == Keys.Space) kShoot = false;
            };
        }

        private void MainLoop(object sender, EventArgs e)
        {
            if (pHealth <= 0) {
                this.Invalidate();
                return; // Game over freeze
            }

            // Input processing
            if (kUp) {
                int nextX = (int)(posX + dirX * moveSpeed * 1.5);
                int nextY = (int)(posY + dirY * moveSpeed * 1.5);
                if (nextX >= 0 && nextX < 15) {
                    if(map[nextX, (int)posY] == 0) posX += dirX * moveSpeed;
                }
                if (nextY >= 0 && nextY < 15) {
                    if(map[(int)posX, nextY] == 0) posY += dirY * moveSpeed;
                }
            }
            if (kDown) {
                int nextX = (int)(posX - dirX * moveSpeed * 1.5);
                int nextY = (int)(posY - dirY * moveSpeed * 1.5);
                if (nextX >= 0 && nextX < 15) {
                    if(map[nextX, (int)posY] == 0) posX -= dirX * moveSpeed;
                }
                if (nextY >= 0 && nextY < 15) {
                    if(map[(int)posX, nextY] == 0) posY -= dirY * moveSpeed;
                }
            }
            if (kRight) {
                double oldDirX = dirX;
                dirX = dirX * Math.Cos(-rotSpeed) - dirY * Math.Sin(-rotSpeed);
                dirY = oldDirX * Math.Sin(-rotSpeed) + dirY * Math.Cos(-rotSpeed);
                double oldPlaneX = planeX;
                planeX = planeX * Math.Cos(-rotSpeed) - planeY * Math.Sin(-rotSpeed);
                planeY = oldPlaneX * Math.Sin(-rotSpeed) + planeY * Math.Cos(-rotSpeed);
            }
            if (kLeft) {
                double oldDirX = dirX;
                dirX = dirX * Math.Cos(rotSpeed) - dirY * Math.Sin(rotSpeed);
                dirY = oldDirX * Math.Sin(rotSpeed) + dirY * Math.Cos(rotSpeed);
                double oldPlaneX = planeX;
                planeX = planeX * Math.Cos(rotSpeed) - planeY * Math.Sin(rotSpeed);
                planeY = oldPlaneX * Math.Sin(rotSpeed) + planeY * Math.Cos(rotSpeed);
            }

            if (shootCooldown > 0) shootCooldown--;

            if (kShoot && shootCooldown == 0 && pAmmo > 0) {
                shootCooldown = 15;
                pAmmo--;
                
                // Shoot logic: check if any enemy is near center of screen
                foreach(SpriteItem sp in sprites) {
                    if (sp.active && sp.type == 1 && sp.transformY > 0) {
                        // sp.screenX is Where the center of the enemy is on the screen X
                        if (Math.Abs(sp.screenX - (screenWidth / 2)) < (sp.width / 2) + 20) {
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
            foreach(SpriteItem sp in sprites) {
                if(!sp.active) {
                    if (sp.type == 1) {
                        if (sp.respawnTimer > 0) sp.respawnTimer--;
                        else {
                            int rx, ry;
                            do {
                                rx = rnd.Next(1, 14);
                                ry = rnd.Next(1, 14);
                            } while (map[rx, ry] != 0 || (Math.Abs(rx - posX) < 3 && Math.Abs(ry - posY) < 3));
                            sp.x = rx + 0.5;
                            sp.y = ry + 0.5;
                            sp.hp = 100;
                            sp.active = true;
                        }
                    }
                    continue;
                }
                
                double dist = Math.Sqrt((posX - sp.x)*(posX - sp.x) + (posY - sp.y)*(posY - sp.y));
                
                // --- INIMIGOS: Inteligencia Artificial ---
                if(sp.type == 1 && sp.hp > 0) {
                    if (sp.actionCooldown > 0) sp.actionCooldown--;
                    
                    if (dist > 0.6 && dist < 8.0) {
                        // Perseguir o jogador (velocidade reduzida para dar tempo ao jogador)
                        double moveX = ((posX - sp.x) / dist) * 0.05;
                        double moveY = ((posY - sp.y) / dist) * 0.05;
                        
                        // Checar paredes no eixo X
                        int tryX = (int)(sp.x + moveX);
                        int tryY = (int)(sp.y);
                        if (tryX >= 0 && tryX < 15 && tryY >= 0 && tryY < 15 && map[tryX, tryY] == 0) {
                            sp.x += moveX;
                        }
                        
                        // Checar paredes no eixo Y
                        tryX = (int)(sp.x);
                        tryY = (int)(sp.y + moveY);
                        if (tryX >= 0 && tryX < 15 && tryY >= 0 && tryY < 15 && map[tryX, tryY] == 0) {
                            sp.y += moveY;
                        }
                    }
                    else if (dist <= 0.6) {
                        // Se aproximou do jogador, ataca e usa cooldown
                        if (sp.actionCooldown <= 0) {
                            if(pArmor > 0) pArmor -= 10;
                            else pHealth -= 10;
                            
                            if(pArmor < 0) { 
                                pHealth += pArmor; // subtrai o excesso da vida
                                pArmor = 0; 
                            }
                            sp.actionCooldown = 30; // Aguardar 1 segundo (30 frames) para atacar de novo
                        }
                    }
                }

                // --- COLETA DE ITENS ---
                if (dist < 0.6) {
                    if(sp.type == 2 && pHealth < 100) { pHealth += 25; if(pHealth>100) pHealth=100; sp.active = false; }
                    if(sp.type == 3 && pArmor < 100) { pArmor += 50; if(pArmor>100) pArmor=100; sp.active = false; }
                    if(sp.type == 4) { pAmmo += 15; sp.active = false; }
                }
            }

            RenderSpace();
            this.Invalidate();
        }

        private void RenderSpace()
        {
            bg.Clear(Color.Black);
            
            int viewHeight = screenHeight - 40; // leaving 40 for bottom dashboard
            
            // Draw sky/floor
            bg.FillRectangle(Brushes.DarkGray, 0, viewHeight/2, screenWidth, viewHeight/2);
            bg.FillRectangle(Brushes.DarkBlue, 0, 0, screenWidth, viewHeight/2);

            // WALL CASTING
            for(int x = 0; x < screenWidth; x++)
            {
                double cameraX = 2 * x / (double)screenWidth - 1;
                double rayDirX = dirX + planeX * cameraX;
                double rayDirY = dirY + planeY * cameraX;

                int mapX = (int)posX;
                int mapY = (int)posY;

                double sideDistX;
                double sideDistY;

                double deltaDistX = Math.Abs(1 / rayDirX);
                double deltaDistY = Math.Abs(1 / rayDirY);
                double perpWallDist;

                int stepX;
                int stepY;

                int hit = 0;
                int side = 0; 

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

                while (hit == 0)
                {
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
                        if (map[mapX, mapY] > 0) hit = map[mapX, mapY];
                    } else {
                        hit = 1; 
                    }
                }

                if (side == 0) perpWallDist = (mapX - posX + (1 - stepX) / 2) / rayDirX;
                else           perpWallDist = (mapY - posY + (1 - stepY) / 2) / rayDirY;

                if (perpWallDist == 0) perpWallDist = 0.01;
                ZBuffer[x] = perpWallDist;

                int lineHeight = (int)(viewHeight / perpWallDist);

                int drawStart = -lineHeight / 2 + viewHeight / 2;
                if(drawStart < 0) drawStart = 0;
                int drawEnd = lineHeight / 2 + viewHeight / 2;
                if(drawEnd >= viewHeight) drawEnd = viewHeight - 1;

                Color c = Color.Gray;
                if(hit == 1) c = Color.DarkRed;

                if(side == 1) c = Color.FromArgb(c.R / 2, c.G / 2, c.B / 2); // shadow

                using(SolidBrush b = new SolidBrush(c)) {
                    bg.FillRectangle(b, x, drawStart, 1, drawEnd - drawStart);
                }
            }

            // SPRITE CASTING
            for(int i=0; i<sprites.Count; i++) {
                sprites[i].dist = ((posX - sprites[i].x) * (posX - sprites[i].x) + (posY - sprites[i].y) * (posY - sprites[i].y));
            }
            sprites.Sort(delegate(SpriteItem a, SpriteItem b) { return b.dist.CompareTo(a.dist); });

            double invDet = 1.0 / (planeX * dirY - dirX * planeY); 

            foreach(SpriteItem sp in sprites) {
                if(!sp.active) continue;

                double spriteX = sp.x - posX;
                double spriteY = sp.y - posY;

                double transformX = invDet * (dirY * spriteX - dirX * spriteY);
                double transformY = invDet * (-planeY * spriteX + planeX * spriteY);

                sp.transformY = transformY;

                if (transformY > 0.05) { // Ensure it's in front and avoid zero div
                    int spriteScreenX = (int)((screenWidth / 2) * (1 + transformX / transformY));
                    sp.screenX = spriteScreenX;

                    double fHeight = viewHeight / transformY;
                    if (fHeight > screenHeight * 10) fHeight = screenHeight * 10;
                    int spriteHeight = (int)fHeight;

                    int drawStartY = -spriteHeight / 2 + viewHeight / 2;
                    if (drawStartY < 0) drawStartY = 0;
                    int drawEndY = spriteHeight / 2 + viewHeight / 2;
                    if (drawEndY >= viewHeight) drawEndY = viewHeight - 1;

                    double fWidth = viewHeight / transformY;
                    if (fWidth > screenWidth * 10) fWidth = screenWidth * 10;
                    int spriteWidth = (int)fWidth;
                    sp.width = spriteWidth;

                    int drawStartX = -spriteWidth / 2 + spriteScreenX;
                    if (drawStartX < 0) drawStartX = 0;
                    int drawEndX = spriteWidth / 2 + spriteScreenX;
                    if (drawEndX >= screenWidth) drawEndX = screenWidth - 1;

                    for (int stripe = drawStartX; stripe < drawEndX; stripe++) {
                        int texX = (int)(256 * (stripe - (-spriteWidth / 2 + spriteScreenX)) * enemyTex.Width / spriteWidth) / 256;
                        
                        if (transformY < ZBuffer[stripe]) {
                            if (sp.type == 1) {
                                bg.DrawImage(enemyTex, new Rectangle(stripe, drawStartY, 1, drawEndY - drawStartY), new Rectangle(texX, 0, 1, enemyTex.Height), GraphicsUnit.Pixel);
                            } else if (sp.type == 2) {
                                if(healthTex.Width > 1) {
                                  int tX = (int)(256 * (stripe - (-spriteWidth / 2 + spriteScreenX)) * healthTex.Width / spriteWidth) / 256;
                                  bg.DrawImage(healthTex, new Rectangle(stripe, drawStartY, 1, drawEndY - drawStartY), new Rectangle(tX, 0, 1, healthTex.Height), GraphicsUnit.Pixel);
                                } else bg.FillRectangle(Brushes.White, stripe, drawStartY + spriteHeight/2, 1, spriteHeight/2);
                            } else if (sp.type == 3) {
                                if(armorTex.Width > 1) {
                                  int tX = (int)(256 * (stripe - (-spriteWidth / 2 + spriteScreenX)) * armorTex.Width / spriteWidth) / 256;
                                  bg.DrawImage(armorTex, new Rectangle(stripe, drawStartY, 1, drawEndY - drawStartY), new Rectangle(tX, 0, 1, armorTex.Height), GraphicsUnit.Pixel);
                                } else bg.FillRectangle(Brushes.Green, stripe, drawStartY + spriteHeight/2, 1, spriteHeight/2);
                            } else if (sp.type == 4) {
                                if(ammoTex.Width > 1) {
                                  int tX = (int)(256 * (stripe - (-spriteWidth / 2 + spriteScreenX)) * ammoTex.Width / spriteWidth) / 256;
                                  bg.DrawImage(ammoTex, new Rectangle(stripe, drawStartY, 1, drawEndY - drawStartY), new Rectangle(tX, 0, 1, ammoTex.Height), GraphicsUnit.Pixel);
                                } else bg.FillRectangle(Brushes.Blue, stripe, drawStartY + spriteHeight/2, 1, spriteHeight/2);
                            }
                        }
                    }
                }
            }

            // WEAPON
            int bw = 40;
            int bh = 100;
            if (weaponTex.Width > 1) {
                bw = weaponTex.Width;
                bh = weaponTex.Height;
                float scale = (float)viewHeight / bh;
                bw = (int)(bw * scale);
                bh = (int)(bh * scale);
            }
            int bOffset = 0;
            if (kUp || kDown) bOffset = (int)(Math.Sin(Environment.TickCount / 100.0) * 10); // view bobbing
            
            if (shootCooldown > 10) {
                bg.FillPie(Brushes.Yellow, screenWidth / 2 - 30 + bOffset, viewHeight - bh - 30, 60, 60, 0, 360);
            }
            
            if (weaponTex.Width > 1) {
                bg.DrawImage(weaponTex, screenWidth / 2 - bw / 2 + bOffset, viewHeight - bh, bw, bh);
            } else {
                // basic shotgun fallback
                bw = 40; bh = 100;
                bg.FillRectangle(Brushes.DimGray, screenWidth / 2 - bw / 2 + bOffset, viewHeight - bh, bw, bh);
                bg.FillRectangle(Brushes.Black, screenWidth / 2 - bw / 4 + bOffset, viewHeight - bh + 10, bw / 2, 20); // barrel hole
            }

            // HUD
            bg.FillRectangle(Brushes.Gray, 0, viewHeight, screenWidth, 40);
            bg.FillRectangle(Brushes.DimGray, 5, viewHeight + 5, screenWidth - 10, 30);
            using(Font f = new Font("Impact", 12)) {
                bg.DrawString(string.Format("HP: {0}%", pHealth), f, pHealth<=20?Brushes.Red:Brushes.White, 10, viewHeight + 8);
                bg.DrawString(string.Format("ARM: {0}%", pArmor), f, Brushes.LightGreen, 90, viewHeight + 8);
                bg.DrawString(string.Format("AMMO: {0}", pAmmo), f, Brushes.Yellow, 200, viewHeight + 8);
            }

            if(pHealth <= 0) {
                using(Font f = new Font("Impact", 36)) {
                    bg.DrawString("VOCE MORREU!", f, Brushes.DarkRed, screenWidth/2 - 140, viewHeight/2 - 30);
                }
            }
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.InterpolationMode = InterpolationMode.NearestNeighbor;
            e.Graphics.DrawImage(buffer, 0, 0, this.ClientSize.Width, this.ClientSize.Height);
        }

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.Run(new GameForm());
        }
    }
}
