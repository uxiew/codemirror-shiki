const n=`# Nix 开发环境

在 Markdown 的围栏代码块中使用 Nix 语法。

\`\`\`nix
{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  name = "syntax-lab";
  packages = with pkgs; [ nodejs pnpm git ];

  shellHook = ''
    echo "欢迎来到语法实验室"
  '';
}
\`\`\`

运行 \`nix-shell\` 即可开始。
`;export{n as default};
