const e=`@let user = { name: 'Shiki', active: true };
@let greeting = '你好，' + user.name;

<article class="profile">
  <h1>{{ greeting }}</h1>
  @let status = user.active ? '在线' : '离线';
  <span [class.online]="user.active">{{ status }}</span>
</article>
`;export{e as default};
