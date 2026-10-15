import "csstype";
declare module "csstype" {
  interface Properties<TLength = string | 0, TTime = string> {
    [key: `--${string}`]: string | number;
  }
}
