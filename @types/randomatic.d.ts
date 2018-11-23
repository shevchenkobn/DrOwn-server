declare module 'randomatic' {
  export interface Options {
    exclude?: string | string[];
  }

  export interface CharOptions extends Options {
    chars: string;
  }

  interface Randomatic {
    (pattern: '?', length: number, options: CharOptions): string;
    (pattern: '?', options: CharOptions): string;
    (length: number): string;
    (pattern: string): string;
    (pattern: string, length: number, options?: Options): string;

    readonly isCrypto: boolean
  }
  var randomatic: Randomatic;

  export default randomatic;
}