export class ColorUtil {
  static miredToRGB(mired: number): [number, number, number] {
    return this.kelvinToRGB(1e6 / mired);
  }

  static kelvinToRGB(kelvin: number): [number, number, number] {
    const temp = kelvin / 100;
    let red, green, blue;

    if (temp <= 66) {
      red = 255;
      green = temp;
      green = 99.4708025861 * Math.log(green) - 161.1195681661;

      if (temp <= 19) {
        blue = 0;
      } else {
        blue = temp - 10;
        blue = 138.5177312231 * Math.log(blue) - 305.0447927307;
      }
    } else {
      red = temp - 60;
      red = 329.698727446 * Math.pow(red, -0.1332047592);
      green = temp - 60;
      green = 288.1221695283 * Math.pow(green, -0.0755148492);
      blue = 255;
    }

    return [
      Math.min(Math.max(Math.round(red), 0), 255),
      Math.min(Math.max(Math.round(green), 0), 255),
      Math.min(Math.max(Math.round(blue), 0), 255),
    ];
  }
}
