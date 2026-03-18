export interface CMProps {
  lang: {
    name: string;
    value: string;
    grammar: any;
  };
  theme: {
    name: string;
    value: string;
  };
  engine: 'oniguruma' | 'javascript';
  mode: 'shiki' | 'editor';
}
