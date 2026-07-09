import * as THREE from 'three'

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** Animated day/night: orbiting sun, hemisphere ambient, sky + fog colours. */
export class Sky {
  readonly sun: THREE.DirectionalLight
  readonly hemi: THREE.HemisphereLight
  /** Time of day in [0, 1). 0.25 = sunrise, 0.5 = noon, 0.75 = sunset. */
  time = 0.32

  private nightSky = new THREE.Color(0x05070f)
  private daySky = new THREE.Color(0x87bdec)
  private duskSky = new THREE.Color(0xdd8748)
  private nightGround = new THREE.Color(0x0a0a12)
  private dayGround = new THREE.Color(0x6b7a55)
  private sunDayColor = new THREE.Color(0xfff4e0)
  private sunDuskColor = new THREE.Color(0xff8a3a)

  private skyColor = new THREE.Color()
  private tmpColor = new THREE.Color()
  private sunDir = new THREE.Vector3()

  constructor() {
    this.sun = new THREE.DirectionalLight(0xffffff, 1)
    this.hemi = new THREE.HemisphereLight(0x87bdec, 0x6b7a55, 0.6)
  }

  addTo(scene: THREE.Scene): void {
    scene.add(this.sun)
    scene.add(this.sun.target)
    scene.add(this.hemi)
  }

  update(dt: number, dayLength: number, playerPos: THREE.Vector3, scene: THREE.Scene): void {
    this.time = (this.time + dt / dayLength) % 1
    const t = this.time
    const ang = (t - 0.25) * Math.PI * 2
    const elevation = Math.sin(ang)
    const azimuth = Math.cos(ang)
    const day = clamp01(elevation * 1.4 + 0.35)
    const horizon = clamp01(1 - Math.abs(elevation) * 2.6)

    // sky + fog colour
    this.skyColor.copy(this.nightSky).lerp(this.daySky, day)
    this.skyColor.lerp(this.duskSky, horizon * 0.55)
    scene.background = this.skyColor
    if (scene.fog) (scene.fog as THREE.Fog).color.copy(this.skyColor)

    // sun as a directional light aimed at the player
    this.sunDir.set(azimuth, Math.max(elevation, -0.15), 0.35).normalize()
    this.sun.position
      .copy(this.sunDir)
      .multiplyScalar(160)
      .add(playerPos)
    this.sun.target.position.copy(playerPos)
    this.sun.intensity = clamp01(elevation) * 0.9 + 0.04
    this.tmpColor.copy(this.sunDayColor).lerp(this.sunDuskColor, horizon)
    this.sun.color.copy(this.tmpColor)

    // hemisphere ambient
    this.hemi.intensity = 0.25 + day * 0.5
    this.hemi.color.copy(this.skyColor)
    this.hemi.groundColor.copy(this.nightGround).lerp(this.dayGround, day)
  }
}
