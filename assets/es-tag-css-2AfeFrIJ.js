const n=`const accent = '#d66a3a';

const styles = css\`
  :host {
    display: block;
    color: \${accent};
  }

  .card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px #0001;
  }

  @media (max-width: 600px) {
    .card { padding: 16px; }
  }
\`;
`;export{n as default};
