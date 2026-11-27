const e=`<section class="welcome">
  <h1>你好，{{ user.name | uppercase }}</h1>
  <p>今天是 {{ today | date : 'yyyy-MM-dd' }}</p>
  <p>总计：{{ price * quantity | currency : 'CNY' }}</p>
  <button [disabled]="!user.active" (click)="save()">
    {{ saving ? '保存中…' : '保存更改' }}
  </button>
</section>
`;export{e as default};
