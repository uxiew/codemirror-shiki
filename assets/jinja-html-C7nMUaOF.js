const e=`<!doctype html>
<html lang="zh-CN">
  <head><title>{{ title | default('我的项目') }}</title></head>
  <body>
    <h1>你好，{{ user.name | capitalize }}</h1>
    <ul class="projects">
      {% for project in projects %}
        <li class="{{ 'featured' if project.featured else '' }}">
          <a href="{{ project.url }}">{{ project.name }}</a>
        </li>
      {% else %}
        <li>还没有项目</li>
      {% endfor %}
    </ul>
  </body>
</html>
`;export{e as default};
