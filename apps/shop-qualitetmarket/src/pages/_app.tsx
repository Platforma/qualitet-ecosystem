import type { AppProps } from "next/app";
import "../styles/shop.css";

export default function ShopApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
