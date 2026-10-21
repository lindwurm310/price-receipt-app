import { NativeModules } from 'react-native';
import TextRecognition, { TextRecognitionScript, type TextLine } from '@react-native-ml-kit/text-recognition';

import { rowsToText, type OcrLine } from './ocrRows';

/** ML Kit は Expo Go に含まれないため、開発用ビルドでのみ使える */
export const isOcrAvailable = (): boolean => Boolean(NativeModules.TextRecognition);

/**
 * 画像から文字を読み、レシートの「行」単位のテキストにして返す。
 * ML Kit は品名と価格を別ブロックとして返すことが多いので、座標で同じ行にまとめ直す。
 */
export async function recognizeReceipt(imageUri: string): Promise<string> {
  const result = await TextRecognition.recognize(imageUri, TextRecognitionScript.JAPANESE);
  const lines: OcrLine[] = result.blocks
    .flatMap((b) => b.lines)
    .filter((l): l is TextLine & { frame: NonNullable<TextLine['frame']> } => Boolean(l.frame))
    .map((l) => ({ text: l.text, left: l.frame.left, top: l.frame.top, height: l.frame.height }));
  return lines.length > 0 ? rowsToText(lines) : result.text;
}
