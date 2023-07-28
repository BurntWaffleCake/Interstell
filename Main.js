class ProjectileGroup extends Phaser.Physics.Arcade.Group {
    constructor(scene, spriteName) {
        super(scene.physics.world, scene);

        // Initialize the group
        this.createMultiple({
            classType: Projectile, // This is the class we create just below
            frameQuantity: 1000, // Create 200 instances in the pool
            active: false,
            visible: false,
            key: spriteName
        })
    }

    fire(x, y, direction, config) {
        // Get the first available sprite in the group
        const newProjectile = this.getFirstDead(false);
        if (newProjectile) {
            newProjectile.fire(x, y, direction, config);
        }
    }
}

class Projectile extends Phaser.Physics.Arcade.Sprite {
    _distanceTraveled = 0;
    _previousPosition;
    _secondsPassed = 0;
    _pierceCount = 0;
    _piercedObjects = [];

    UUID;

    active = false;

    maxDistance = 0;
    maxPierce = 0;
    damage = 0;

    constructor(scene, x, y, spriteName) {
        super(scene, x, y, spriteName);

        this._previousPosition = { x: x, y: y } //reset previous position for distance calculation
        this._distanceTraveled = 0;
        this._secondsPassed = 0;
        this._pierceCount = 0;
    }

    resetValues(x, y) {
        this._previousPosition = { x: x, y: y } //reset previous position for distance calculation
        this._distanceTraveled = 0;
        this._secondsPassed = 0;
        this._pierceCount = 0;
        this._piercedObjects = []

        this.maxDistance = 0;
        this.maxPierce = 0;
        this.damage = 0;
    }

    _testAlive() {
        if (!this.active) { return false }
        if (this.y <= 0 || this.y >= config.height || this.x <= 0 || this.x >= config.width) { return false }
        if (this.maxDistance <= this._distanceTraveled) { return false };
        if (this._pierceCount > this.maxPierce) { return false };
        return true
    }

    preUpdate(time, delta) { // before the game updates physics
        super.preUpdate(time, delta);

        if (!this._testAlive()) {
            this.active = false;
            this.disableBody(true, true);
        }

        this._timePassed += delta;
        this._distanceTraveled += Phaser.Math.Distance.Between(this._previousPosition.x, this._previousPosition.y, this.x, this.y);

        this._previousPosition = { x: this.x, y: this.y }
        this.rotation = Math.atan2(this.body.velocity.y / this.body.velocity.length(), this.body.velocity.x / this.body.velocity.length());
    }

    fire(x, y, direction, config) {
        this.resetValues(x, y);

        this.enableBody(true, x, y, true, true);
        this.setActive(true);
        this.setVisible(true);

        this.setBodySize(config.width || 10, config.height || 10, true);
        this.setDisplaySize(25, 5)
        this.maxDistance = config.maxDistance;
        this.maxPierce = config.maxPierce;
        this.damage = config.damage;

        this.active = true;

        direction.normalize();
        this.setVelocity((config.speed) * direction.x, (config.speed) * direction.y) // default speed is 100
    }

    onHit(hitObject) {
        if (!this.active) { return }
        if (this._piercedObjects.find(element => element == hitObject.UUID)) { console.log("balls"); return }
        this._pierceCount += 1;
        this._piercedObjects.push(hitObject.UUID);
    }
}

class Player extends Phaser.Physics.Arcade.Sprite {
    _iframeremainingtime = 0;
    _timesincelastshot = 0;

    iframeTime = .25; //seconds

    shootTimer;
    shooting = false
    shotDebounce = false

    myscene;
    myprojectilegroup;

    accelerationFactor = 1000
    turnAcceleration = 1000
    turnRate = 145
    movementSpeed = 3000
    maxMovementSpeed = 250

    health = 100
    xp = 0;
    level = 1;
    levelreq = 50

    shotAmount = 1
    shotSpread = 5
    fireRate = 100 // rounds per minute

    shotSpeed = 1000
    shotDamage = 10000;
    shotPierce = 0;
    shotDistance = 10000;

    vamp = 0;

    UUID = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));

    constructor(scene, x, y) {
        super(scene, x, y, 'player');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        //this.setCollideWorldBounds(true);

        this.setDamping(true)
        this.setDrag(.25, .25)
        this.setAngularDrag(100)
        this.setBounce(.5, .5)
        this.setMaxVelocity(this.maxMovementSpeed, this.maxMovementSpeed)
        this.myscene = scene;
        this.myprojectilegroup = scene.playerProjectileGroup
    }

    shoot() {
        let playerLookVector = new Phaser.Math.Vector2(Math.cos(this.rotation), Math.sin(this.rotation))

        for (let i = 0; i < this.shotAmount; i++) {
            let dividend = ~~(this.shotAmount / 2)
            let bulletLookVector = playerLookVector.clone()
            let evenAddition = (this.shotAmount % 2 == 0) ? (this.shotSpread / 2 * Math.PI / 180) : 0

            bulletLookVector.rotate((this.shotSpread * Math.PI / 180) * (i - dividend) + evenAddition)
            this.myprojectilegroup.fire(this.x, this.y, bulletLookVector, {
                speed: this.shotSpeed,
                damage: this.shotDamage,
                maxPierce: this.shotPierce,
                maxDistance: this.shotDistance,
                width: 15,
                heigh: 10
            })
        }
    }

    isAlive() {
        if (this.health <= 0) { return false }
        return true
    }

    updatePlayerMovement() {
        this.setAcceleration(0, 0)
        this.setAngularAcceleration(0)

        let playerMouseDelta = new Phaser.Math.Vector2(this.myscene.input.mousePointer.x - this.x, this.myscene.input.mousePointer.y - this.y)
        let playerLookVector = new Phaser.Math.Vector2(Math.cos(this.rotation), Math.sin(this.rotation))

        this.setRotation(Math.atan2(playerMouseDelta.y, playerMouseDelta.x))

        let movementVector = new Phaser.Math.Vector2(0, 0)

        if (this.myscene.keys.W.isDown) { movementVector.add(new Phaser.Math.Vector2(0, -1)) }
        if (this.myscene.keys.A.isDown) { movementVector.add(new Phaser.Math.Vector2(-1, 0)) }
        if (this.myscene.keys.S.isDown) { movementVector.add(new Phaser.Math.Vector2(0, 1)) }
        if (this.myscene.keys.D.isDown) { movementVector.add(new Phaser.Math.Vector2(1, 0)) }

        movementVector.normalize()

        this.setAcceleration(this.movementSpeed * movementVector.x, this.movementSpeed * movementVector.y)
    }

    preUpdate(time, deltaTime) {
        super.preUpdate(time, deltaTime)

        if (!this.isAlive()) {
            this.myscene.playerDied();
            this.destroy()
            return
        }

        if (this._iframeremainingtime > 0) {
            this._iframeremainingtime = Math.max(0, this._iframeremainingtime - deltaTime);
        }

        this._timesincelastshot += deltaTime
        if (this._timesincelastshot >= (1 / (this.fireRate / 60) * 1000) && this.myscene.input.mousePointer.isDown) {
            this._timesincelastshot = 0;
            this.shoot()
        }

        this.updatePlayerMovement()
    }

    takeDamage(damage) {
        if (this._iframeremainingtime > 0) {
            return;
        }
        this._iframeremainingtime = this.iframeTime * 1000;
        this.health -= damage;
        this.myscene.gui.setText(("HP: " + this.health + "  |  Level: " + this.level + "  |  XP Needed: " + (this.levelreq - this.xp)));
    }

    checkxp() {
        if (this.xp >= this.levelreq) {
            this.xp -= this.levelreq;
            this.level += 1;
            this.health += 25;
            if (this.health > 100) {
                this.health = 100;
            }
            if (this.level % 3 ==0) {
                this.shotAmount += 1;
            }
            this.shotDamage += 1;
            this.shotSpeed += 100;
            this.shotPierce += 1;
            this.levelreq = Math.floor(this.levelreq * 1.25)
            this.fireRate += 10;
            this.myscene.createShooterEnemy(this.myscene);
            this.myscene.createSwarmEnemy(this.myscene);

            console.log("level up");
            this.myscene.gui.setText("HP: " + this.health + "  Level: " + this.level);
            if (this.level == 2) {
                for (let i = 1; i <= 4; i++) {
                    this.myscene.createShooterEnemy(this.myscene)
                }
            } else if (this.level >= 2) {
                this.myscene.createShooterEnemy(this.myscene);
            }
        }
        this.myscene.gui.setText(("HP: " + this.health + "  |  Level: " + this.level + "  |  XP Needed: " + (this.levelreq - this.xp)));
    }
}

class SwarmEnemy extends Phaser.Physics.Arcade.Sprite {
    _timesincelastmove = 0;
    _scene;

    target;
    health = 50;
    moveDelay = 1; //seconds
    attackDamage = 5;
    alive = true;

    UUID = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));

    constructor(scene, x, y) {
        super(scene, x, y, 'swarmEnemy');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this._scene = scene;
        this.setGravityY(0);
        this.setScale(.5);
        this.move(this);
        this.setMaxVelocity(150, 150);
    }

    setTarget(target) {
        this.target = target
    }

    isAlive() {
        if (this.health <= 0) { return false }
        return true
    }

    kill() {
        this.destroy();
        this.alive = false;
        this._scene.player.xp += 5;
        this._scene.player.checkxp();
        this._scene.guiTimer = this._scene.time.delayedCall(10000, this._scene.createSwarmEnemy(this._scene));
        this._scene.player.health += this._scene.player.vamp;
        if (this._scene.player.health > 100) {
            this._scene.player.health = 100;
        }
    }

    //moves the enemy to a random targeted location
    move() {
        let newspotx = Phaser.Math.Between(1, config.width);
        let newspoty = Phaser.Math.Between(1, config.height);
        // this.setVelocity(0)

        this.setAccelerationX((this._scene.player.x - this.x) + Phaser.Math.Between(50, 150));
        this.setAccelerationY((this._scene.player.y - this.y) + Phaser.Math.Between(50, 150));
    }

    preUpdate(time, deltaTime) {
        super.preUpdate(time, deltaTime)
        if (!this.isAlive()) { this.kill(); return; }

        this.rotation = Math.atan2(this.target.y - this.y, this.target.x - this.x);

        this._timesincelastmove += deltaTime;
        if (this._timesincelastmove >= this.moveDelay * 1000) {
            this.move();
            this._timesincelastmove = 0;
        }


    }

    takeDamage(damage) {
        this.health -= damage;
    }
}

class TankEnemy extends Phaser.Physics.Arcade.Sprite {
    _timesincelastmove = 0;
    _shotdelaytime = 0;
    _scene;
    _projectileGroup;

    health = 500;
    shotDelay = 3; //seconds
    attackDamage = 20;
    alive = true;

    UUID = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));

    constructor(scene, x, y, direction) {
        super(scene, x, y, 'tankEnemy');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this._scene = scene;
        this._projectileGroup = scene.enemyProjectileGroup

        direction.normalize()
        this.setVelocity(direction.x * 100, direction.y * 100)

        this.setGravityY(0);
        this.setScale(.1);
    }

    isAlive() {
        if (this.health <= 0) { return false }
        return true
    }

    kill() {
        this.destroy();
        this.alive = false;
    }

    shoot() {
        let randomStart = Phaser.Math.FloatBetween(0, Math.PI / 4)

        for (let i = 0; i < 8; i++) {
            this._projectileGroup.fire(this.x, this.y, new Phaser.Math.Vector2(1, 0).rotate(randomStart + (Math.PI / 4 * i)), {
                speed: 500,
                damage: 5,
                maxPierce: 0,
                maxDistance: 1000,
                width: 30,
                height: 10,
            })
        }
    }

    preUpdate(time, deltaTime) {
        super.preUpdate(time, deltaTime)
        if (!this.isAlive()) { this.kill(); return; }

        this.rotation = time / 1000;

        this._shotdelaytime = Math.max(0, this._shotdelaytime - deltaTime)
        if (this._shotdelaytime <= 0) {
            this.shoot();
            this._shotdelaytime = this.shotDelay * 1000
        }
    }

    takeDamage(damage) {
        this.health -= damage;
    }
}

class AsteroidChunk extends Phaser.Physics.Arcade.Sprite {
    _scene;

    health = 500;
    attackDamage = 5;
    alive = true;

    UUID = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));

    constructor(scene, x, y, direction, scale) {
        super(scene, x, y, 'asteroidChunk');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this._scene = scene;

        this.setGravityY(0);
        this.setScale(Phaser.Math.FloatBetween(.05, scale / 2));

        direction.normalize()
        this.setVelocity(direction.x * 200 * (.5 - this.scale), direction.y * 200 * (.5 - this.scale))

        this.health *= this.scale
    }

    isAlive() {
        if (this.health <= 0) { return false }
        return true
    }

    kill() {
        this.destroy();
        this.alive = false;
    }

    preUpdate(time, deltaTime) {
        super.preUpdate(time, deltaTime)
        if (!this.isAlive()) { this.kill(); return; }

        this.rotation = time / 1000 * (1 + this.scale);
    }

    takeDamage(damage) {
        this.health -= damage;
    }
}

class Asteroid extends Phaser.Physics.Arcade.Sprite {
    _scene;

    health = 5000;
    attackDamage = 10;
    alive = true;

    UUID = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));

    constructor(scene, x, y, direction) {
        super(scene, x, y, 'asteroid');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this._scene = scene;

        this.setGravityY(0);
        this.setScale(Phaser.Math.FloatBetween(.05, .3));

        direction.normalize()
        this.setVelocity(direction.x * 100 * (.5 - this.scale), direction.y * 100 * (.5 - this.scale))

        this.health *= this.scale
    }

    isAlive() {
        if (this.health <= 0) { return false }
        return true
    }

    kill() {
        for (let i = 0; i < 4; i++) {
            let newAsteroidChunk = new AsteroidChunk(this._scene, this.x, this.y, this.body.velocity.clone().rotate(Math.PI / 2 * i), this.scale)
            this._scene.enemies.push(newAsteroidChunk)
        }
        this.destroy();
        this.alive = false;
    }

    preUpdate(time, deltaTime) {
        super.preUpdate(time, deltaTime)
        if (!this.isAlive()) { this.kill(); return; }

        this.rotation = time / 1000 * (1 + this.scale);
    }

    takeDamage(damage) {
        this.health -= damage;
    }
}

class ShooterEnemy extends Phaser.Physics.Arcade.Sprite {
    _timesincelastmove = 0;
    _shotdelaytime = 0;
    _scene;
    _projectileGroup;
    _currentFlashTween;

    flashGraphic;

    target;
    health = 100;
    moveDelay = 1; //seconds
    shotDelay = 2; //seconds
    shotEnvelope = .5 // randomize to min and max
    attackDamage = 5;
    alive = true;

    UUID = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));

    constructor(scene, x, y) {
        super(scene, x, y, 'shooterEnemy');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this._scene = scene;
        this._projectileGroup = scene.enemyProjectileGroup

        this.setGravityY(0);
        this.setScale(.25);
        this.move(this);
        this.setMaxVelocity(150, 150);
    }

    setTarget(target) {
        this.target = target
    }

    isAlive() {
        if (this.health <= 0) { return false }
        return true
    }

    kill() {
        this.destroy();
        this.alive = false;
        this._scene.player.xp += 10;
        this._scene.player.checkxp();
        this._scene.guiTimer = this._scene.time.delayedCall(10000, this._scene.createShooterEnemy(this._scene));
        this._scene.player.health += this._scene.player.vamp;
        if (this._scene.player.health > 100) {
            this._scene.player.health = 100;
        }
    }

    //moves the enemy to a random targeted location
    move() {
        let newspotx = Phaser.Math.Between(1, config.width);
        let newspoty = Phaser.Math.Between(1, config.height);
        this.setAccelerationX((newspotx - this.x) / 3);
        this.setAccelerationY((newspoty - this.y) / 3);
    }

    shoot() {
        this._projectileGroup.fire(this.x, this.y, new Phaser.Math.Vector2(Math.cos(this.rotation), Math.sin(this.rotation)), {
            speed: 500,
            damage: 5,
            maxPierce: 0,
            maxDistance: 1000,
            width: 10,
            height: 10,
        })
    }

    preUpdate(time, deltaTime) {
        super.preUpdate(time, deltaTime)
        if (!this.isAlive()) { this.kill(); return; }

        this.rotation = Math.atan2(this.target.y - this.y, this.target.x - this.x);

        this._timesincelastmove += deltaTime;
        if (this._timesincelastmove >= this.moveDelay * 1000) {
            this.move();
            this._timesincelastmove = 0;
        }

        this._shotdelaytime = Math.max(0, this._shotdelaytime - deltaTime)
        if (this._shotdelaytime <= 0) {
            this.shoot();
            this._shotdelaytime = (this.shotDelay + Phaser.Math.FloatBetween(-this.shotEnvelope, this.shotEnvelope)) * 1000
        }
    }

    takeDamage(damage) {
        this.health -= damage;
        if (this._currentFlashTween && this._currentFlashTween.progress < 1) { return }
        this._currentFlashTween = this._scene.tweens.add({
            targets: this,
            alpha: 0,
            ease: 'Cubic.easeOut',
            duration: 50,
            repeat: 1,
            yoyo: true
        })
    }
}

class RunnerEnemy extends Phaser.Physics.Arcade.Sprite {
    _scene;

    health = 20;
    attackDamage = 15;
    alive = true;

    useWave = true;
    waveAmplitude = 0
    waveTimeScale = 0

    moveDirection;

    UUID = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));

    constructor(scene, x, y, direction) {
        super(scene, x, y, 'runnerEnemy');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this._scene = scene;
        this.setGravityY(0);
        this.setDisplaySize(45, 15)

        this.moveDirection = direction.normalize().scale(Phaser.Math.Between(400, 600))
        this.waveAmplitude = Phaser.Math.Between(0, 300)
        this.waveTimeScale = Phaser.Math.Between(1, 5)
    }

    isAlive() {
        if (this.health <= 0) { return false }
        return true
    }

    kill() {
        this.destroy();
        this.alive = false;
    }

    preUpdate(time, deltaTime) {
        super.preUpdate(time, deltaTime)
        if (!this.isAlive()) { this.kill(); return; }

        this.rotation = Math.atan2(this.body.velocity.y, this.body.velocity.x);


        if (this.useWave) {
            let moveVector = this.moveDirection.clone()
            let rightVector = this.moveDirection.clone().normalize().rotate(Math.PI / 2).scale(this.waveAmplitude * Math.cos(this.waveTimeScale * time / 1000))

            this.body.velocity = moveVector.add(rightVector)
        }
    }

    takeDamage(damage) {
        this.health -= damage;
    }
}

class GameScreen extends Phaser.Scene {
    player;
    playerDead = false;

    playerProjectileGroup;
    enemyProjectileGroup;

    //Keyboard controls
    cursors;
    keys;
    space;

    guiTimer;
    gui;

    enemies = [];

    constructor() {
        super('gamescreen')
    }

    preload() {
        this.load.image('stars', 'assets/images/newstarbackground.png');
            this.load.image('player', 'assets/images/maincharacter.png');

            this.load.image('swarmEnemy', 'assets/images/Swarm.png');
            this.load.image('shooterEnemy', 'assets/images/Imp.png')
            this.load.image('runnerEnemy', 'assets/images/Rocket.png')
            this.load.image('tankEnemy', 'assets/images/Tank.png')

            this.load.image('asteroid', 'assets/images/Asteroid.png')
            this.load.image('asteroidChunk', 'assets/images/AsteroidChunk.png')

            this.load.image('playerLaser', 'assets/images/PlayerLaser.png')
            this.load.image('enemyLaser', 'assets/images/EnemyLaser.png')

            this.load.audio('playershoot', 'assets/audio/playershoot_1.mp3')
    }

    getRandomPointOnEdge() {
        let randomSide;
        let xOrY = Phaser.Math.Between(1, 2)

        if (Phaser.Math.Between(1, 2) == 1) { randomSide = 1; } else { randomSide = -1; }

        if (xOrY == 1) {
            return new Phaser.Math.Vector2(Phaser.Math.Between(0, config.width) * randomSide, -100);
        } else if (xOrY == 2) {
            return new Phaser.Math.Vector2(100 * randomSide, Phaser.Math.Between(0, config.width) * randomSide);
        }
    }

    createRunnerEnemy() {
        for (let i = 1; i <= 4; i++) {
            let spawnPoint = this.getRandomPointOnEdge()

            let myRunner = new RunnerEnemy(this, spawnPoint.x, spawnPoint.y)
            myRunner.target = this.player
            this.enemies.push(myRunner)
        }
    }

    createSwarmEnemy() {
        let direction = Phaser.Math.RandomXY(new Phaser.Math.Vector2())
        let spawnPoint = this.getRandomPointOnEdge()
        let myShooter = new Asteroid(this, spawnPoint.x, spawnPoint.y, direction)
        myShooter.target = this.player;
        this.enemies.push(myShooter)
    }

    createShooterEnemy() {
        let spawnPoint = this.getRandomPointOnEdge()
        let myShooter = new ShooterEnemy(this, spawnPoint.x, spawnPoint.y)
        myShooter.target = this.player;
        this.enemies.push(myShooter)
    }

    playerDied() {
        console.log("playerDied")

        const screenCenterX = this.cameras.main.worldView.x + this.cameras.main.width / 2;
        const screenCenterY = this.cameras.main.worldView.y + this.cameras.main.height / 2;
        this.add.text(screenCenterX, screenCenterY, "You Died", { fontSize: '100px', fill: '#FFFFFF', font: '75px courier' }).setOrigin(.5);

        this.time.delayedCall(3000, this.toMainScreen, [this]);
    }

    toMainScreen(self) {
        self.scene.pause();
        self.scene.start("menuscreen");
    }

    create() {
        let background = this.add.tileSprite(0, 0, game.scale.width, game.scale.height, 'stars').setOrigin(0, 0);
        this.playerProjectileGroup = new ProjectileGroup(this, 'playerLaser');
        this.enemyProjectileGroup = new ProjectileGroup(this, 'enemyLaser');

        this.player = new Player(this, 500, 500, this.playerProjectileGroup);

        for (let i=0; i < 5; i++)
        this.createSwarmEnemy();

        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys('W, A, S, D');

        this.gui = this.add.text(450, 1100, ("HP: " + this.player.health + "  |  Level: " + this.player.level + "  |  XP Needed: " + (this.player.levelreq - this.player.xp)), { fontSize: '50px', fill: '#FFFFFF', font: '50px courier' });
    }

    reflectPosition(target) {
        let targetHeight = target.height * target.scaleY
        let targetWidth = target.width * target.scaleX

        if (target.x >= game.scale.width + targetWidth) {
            target.x = 1
        } else if (target.x <= 0 - targetWidth) {
            target.x = game.scale.width - 1;
        }

        if (target.y >= game.scale.height + targetHeight) {
            target.y = 1
        } else if (target.y <= 0 - targetHeight) {
            target.y = game.scale.height - 1;
        }
    }

    update(time, delta) {
        let deltaSeconds = delta / 1000
        let timeSeconds = time / 1000

        for (let i = 0; i < this.enemies.length; i++) {
            this.reflectPosition(this.enemies[i])
        }
        this.reflectPosition(this.player)

        this.physics.overlap(this.player, this.enemies, function (player, targetEnemy) { player.takeDamage(targetEnemy.attackDamage); });
        this.physics.overlap(this.enemies, this.playerProjectileGroup, function (enemy, playerProjectile) { enemy.takeDamage(playerProjectile.damage); playerProjectile.onHit(enemy); })
        this.physics.overlap(this.player, this.enemyProjectileGroup, function (player, enemyProjectile) { player.takeDamage(enemyProjectile.damage); enemyProjectile.onHit(player); })
    }
}

class MenuScreen extends Phaser.Scene {
    constructor() {
        super('menuscreen');
    }

    startGame() {
        this.scene.pause();
        this.scene.start('gamescreen');
    }

    preload() {
        this.load.image('stars', 'assets/images/newstarbackground.png');
    }

    create() {
        let background = this.add.tileSprite(0, 0, game.scale.width, game.scale.height, 'stars').setOrigin(0, 0);

        const screenCenterX = this.cameras.main.worldView.x + this.cameras.main.width / 2;
        const screenCenterY = this.cameras.main.worldView.y + this.cameras.main.height / 2;

        this.titleText = this.add.text(screenCenterX, screenCenterY, "Interstell", { fontSize: '100px', fill: '#FFFFFF', font: '75px courier' }).setOrigin(.5);
        this.playText = this.add.text(screenCenterX, screenCenterY + 75, "Play", { fontSize: '75px', fill: '#FFFFFF', font: '50px courier' }).setOrigin(.5).setInteractive();
        this.playText.on('pointerdown', function () { console.log("textClicked"); this.scene.startGame(); })
        this.playText.on('pointerover', function () { console.log("textHovered"); this.setColor('#808080') })
        this.playText.on('pointerout', function () { console.log("textUnhovered"); this.setColor('#FFFFFF') })
    }
}

var config = {
    type: Phaser.AUTO,
    width: 1900,
    height: 1180,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            debugShowVelocity: true,
        }
    },

    scene: [MenuScreen, GameScreen]

    //BIG BALLING
    //BigBalling2
};

const game = new Phaser.Game(config);
