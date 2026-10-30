import { expect, it } from 'vitest'
import { MAP_ANCHORS, MAP_HEIGHT, MAP_TILES, MAP_WIDTH, mapPosition } from './map'
it('keeps every illustrative group within the Manta map viewport', () => {
  for (const anchor of MAP_ANCHORS) {
    const { x, y } = mapPosition(anchor.lat, anchor.lon)
    expect(x).toBeGreaterThan(60); expect(x).toBeLessThan(MAP_WIDTH - 60)
    expect(y).toBeGreaterThan(60); expect(y).toBeLessThan(MAP_HEIGHT - 60)
  }
  expect(mapPosition(-.973, -80.722)).toEqual({ x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 })
  expect(MAP_TILES.length).toBeLessThanOrEqual(20)
  expect(MAP_TILES.every(tile => tile.url.startsWith('https://tile.openstreetmap.org/13/'))).toBe(true)
})
