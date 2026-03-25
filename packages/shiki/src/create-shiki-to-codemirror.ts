import type { Options, ShikiToCMOptions } from './types/types';
import defaultOptions from './config';
import { shikiPlugin } from './plugin';

type InitShikiFn = (options: ShikiToCMOptions) => Promise<any>;

export async function createShikiToCodeMirror(
  sourceTag: string,
  shikiOptions: Options,
  initShikiFn: InitShikiFn,
) {
  const normalizedOptions = { ...shikiOptions };
  const { theme, themes } = normalizedOptions;
  if (!themes) {
    if (theme) {
      normalizedOptions.themes = {
        light: theme,
      };
    } else {
      throw new Error(
        `${sourceTag}` +
          'Invalid options, either `theme` or `themes` must be provided',
      );
    }
  }

  if (themes && theme) {
    // Keep one source of truth for theme resolution.
    delete (normalizedOptions as any).theme;
  }

  const options = {
    ...defaultOptions,
    ...normalizedOptions,
  } as ShikiToCMOptions;

  if (options.warnings) {
    if (theme && themes) {
      console.warn(
        `${sourceTag} Both \`theme\` and \`themes\` are provided. \`themes\` will be treated as the source of truth.`,
      );
    }
    if (
      typeof options.defaultColor === 'string' &&
      options.themes &&
      !options.themes[options.defaultColor]
    ) {
      console.warn(
        `${sourceTag} \`defaultColor: "${options.defaultColor}"\` is not a key in \`themes\`. Available keys: ${Object.keys(
          options.themes,
        ).join(', ')}`,
      );
    }
  }

  const shikiInternalCore = await initShikiFn(options);
  return shikiPlugin(shikiInternalCore, options, initShikiFn);
}
