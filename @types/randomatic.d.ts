declare module 'randomatic' {
  namespace Randomatic {
    export interface Options {
      exclude?: string | string[];
    }

    export interface CharOptions extends Options {
      chars: string;
    }
  }

  interface Randomatic {
    (pattern: '?', length: number, options: Randomatic.CharOptions): string;
    (pattern: '?', options: Randomatic.CharOptions): string;
    (length: number): string;
    (pattern: string): string;
    (pattern: string, length: number, options?: Randomatic.Options): string;

    readonly isCrypto: boolean;
  }
  const randomatic: Randomatic;

  export = randomatic;
}
