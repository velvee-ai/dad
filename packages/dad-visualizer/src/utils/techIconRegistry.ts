/**
 * Technology Icon Registry
 *
 * Maps normalized technology keywords to SVG filenames in media/tech-icons/.
 * Supports fuzzy matching: splits technology strings on `, `, `/`, `-`, ` `
 * and matches each token against the registry.
 */

const ICON_MAP: Record<string, string> = {
  // Languages
  typescript: 'TypeScript.svg',
  javascript: 'JavaScript.svg',
  python: 'Python.svg',
  go: 'Go.svg',
  golang: 'Go.svg',
  rust: 'Rust.svg',
  java: 'Java.svg',
  kotlin: 'Kotlin.svg',
  swift: 'Swift.svg',
  ruby: 'Ruby.svg',
  php: 'PHP.svg',
  'c#': 'C#-(CSharp).svg',
  csharp: 'C#-(CSharp).svg',
  'c++': 'C++-(CPlusPlus).svg',
  cplusplus: 'C++-(CPlusPlus).svg',
  c: 'C.svg',
  dart: 'Dart.svg',
  elixir: 'Elixir.svg',
  erlang: 'Erlang.svg',
  scala: 'Scala.svg',
  haskell: 'Haskell.svg',
  clojure: 'Clojure.svg',
  lua: 'Lua.svg',
  perl: 'Perl.svg',
  r: 'R-.svg',
  julia: 'Julia.svg',
  zig: 'Zig.svg',
  nim: 'Nim.svg',
  solidity: 'Solidity.svg',
  bash: 'Bash.svg',
  powershell: 'Powershell.svg',

  // Frontend Frameworks
  react: 'React.svg',
  angular: 'Angular.svg',
  angularjs: 'AngularJS.svg',
  vue: 'Vue.js.svg',
  'vue.js': 'Vue.js.svg',
  vuejs: 'Vue.js.svg',
  svelte: 'Svelte.svg',
  'next.js': 'Next.js.svg',
  nextjs: 'Next.js.svg',
  'nuxt.js': 'Nuxt-JS.svg',
  nuxtjs: 'Nuxt-JS.svg',
  gatsby: 'Gatsby.svg',
  astro: 'Astro.svg',
  'solid.js': 'Solid.js.svg',
  solidjs: 'Solid.js.svg',
  ember: 'Ember.js.svg',
  'ember.js': 'Ember.js.svg',
  qwik: 'Qwik.svg',

  // Backend Frameworks
  express: 'Express.svg',
  'express.js': 'Express.svg',
  fastapi: 'FastAPI.svg',
  django: 'Django.svg',
  flask: 'Flask.svg',
  spring: 'Spring.svg',
  'spring boot': 'Spring.svg',
  rails: 'Ruby-on-Rails.svg',
  'ruby on rails': 'Ruby-on-Rails.svg',
  laravel: 'Laravel.svg',
  symfony: 'Symfony.svg',
  'nest.js': 'Nest.js.svg',
  nestjs: 'Nest.js.svg',
  fastify: 'Fastify.svg',
  koa: 'Node.js.svg',
  'adonis.js': 'AdonisJS.svg',
  adonisjs: 'AdonisJS.svg',
  quarkus: 'Quarkus.svg',
  ktor: 'Ktor.svg',
  phoenix: 'Phoenix-Framework.svg',
  dropwizard: 'Dropwizard.svg',

  // Databases
  postgresql: 'PostgresSQL.svg',
  postgres: 'PostgresSQL.svg',
  mysql: 'MySQL.svg',
  mongodb: 'MongoDB.svg',
  mongo: 'MongoDB.svg',
  redis: 'Redis.svg',
  sqlite: 'SQLite.svg',
  cassandra: 'Apache-Cassandra.svg',
  couchdb: 'CouchDB.svg',
  neo4j: 'New4j.svg',
  influxdb: 'InfluxDB.svg',
  fauna: 'Fauna.svg',
  rocksdb: 'RocksDB.svg',
  oracle: 'Oracle.svg',
  'sql server': 'Microsoft-SQL-Server.svg',
  mssql: 'Microsoft-SQL-Server.svg',
  cosmosdb: 'Cosmos-BD.svg',
  'azure sql': 'Azure-SQL-Database.svg',

  // Message Queues & Streaming
  kafka: 'Apache-Kafka.svg',
  'apache kafka': 'Apache-Kafka.svg',
  rabbitmq: 'RabbitMQ.svg',

  // Cloud Providers
  aws: 'AWS.svg',
  'amazon web services': 'AWS.svg',
  azure: 'Azure.svg',
  gcp: 'Google-Cloud.svg',
  'google cloud': 'Google-Cloud.svg',
  'digital ocean': 'Digital-Ocean.svg',
  digitalocean: 'Digital-Ocean.svg',
  heroku: 'Heroku.svg',
  vercel: 'Vercel.svg',
  cloudflare: 'Cloudflare.svg',
  firebase: 'Firebase.svg',

  // DevOps & Infrastructure
  docker: 'Docker.svg',
  kubernetes: 'Kubernetes.svg',
  k8s: 'Kubernetes.svg',
  terraform: 'HashiCorp-Terraform.svg',
  ansible: 'Ansible.svg',
  jenkins: 'Jenkins.svg',
  'github actions': 'GitHub-Actions.svg',
  gitlab: 'GitLab.svg',
  circleci: 'CircleCI.svg',
  'travis ci': 'Travis-CI.svg',
  'argo cd': 'Argo-CD.svg',
  argocd: 'Argo-CD.svg',
  helm: 'Helm.svg',
  vagrant: 'HashiCorp-Vagrant.svg',
  packer: 'Packer.svg',
  consul: 'Consul.svg',
  vault: 'HashiCorp-Vault.svg',
  prometheus: 'Prometheus.svg',
  grafana: 'Grafana.svg',
  nginx: 'NGINX.svg',
  apache: 'Apache.svg',
  traefik: 'Traefik-Proxy.svg',
  envoy: 'Envoy.svg',
  podman: 'Podman.svg',
  rancher: 'Rancher.svg',
  k3s: 'K3s.svg',

  // Monitoring & Observability
  elasticsearch: 'Elastic-Search.svg',
  kibana: 'Kibana.svg',
  logstash: 'Logstash.svg',
  splunk: 'Splunk.svg',
  opentelemetry: 'OpenTelemetry.svg',
  jaeger: 'Jaeger-Tracing.svg',
  sonarqube: 'SonarQube.svg',

  // API & Protocols
  graphql: 'GraphQL.svg',
  openapi: 'OpenAPI.svg',
  swagger: 'Swagger.svg',
  grpc: 'Go.svg',
  rest: 'OpenAPI.svg',

  // Build Tools
  webpack: 'Webpack.svg',
  vite: 'Vite.js.svg',
  'vite.js': 'Vite.js.svg',
  rollup: 'Rollup.js.svg',
  'rollup.js': 'Rollup.js.svg',
  esbuild: 'JavaScript.svg',
  gradle: 'Gradle.svg',
  maven: 'Apache-Maven.svg',
  npm: 'NPM.svg',
  yarn: 'Yarn.svg',
  pnpm: 'NPM.svg',
  bun: 'Bun.svg',

  // Testing
  jest: 'Jest.svg',
  mocha: 'Mocha.svg',
  cypress: 'Cypress.svg',
  selenium: 'Selenium.svg',
  playwright: 'Playwrite.svg',
  pytest: 'pytest.svg',
  junit: 'JUnit.svg',
  cucumber: 'Cucumber.svg',
  storybook: 'Storybook.svg',

  // CSS / UI
  tailwind: 'Tailwind-CSS.svg',
  'tailwind css': 'Tailwind-CSS.svg',
  tailwindcss: 'Tailwind-CSS.svg',
  bootstrap: 'Bootstrap.svg',
  'material ui': 'Material-UI.svg',
  mui: 'Material-UI.svg',
  sass: 'Sass.svg',
  scss: 'Sass.svg',
  less: 'Less.js.svg',
  css: 'CSS3.svg',
  html: 'HTML5.svg',

  // State Management
  redux: 'Redux.svg',
  mobx: 'MobX.svg',

  // Runtimes
  'node.js': 'Node.js.svg',
  nodejs: 'Node.js.svg',
  node: 'Node.js.svg',
  deno: 'Deno.svg',
  electron: 'Electron.svg',
  tauri: 'Tauri.svg',
  flutter: 'Flutter.svg',
  '.net': 'Visual-Studio.svg',
  dotnet: 'Visual-Studio.svg',

  // Version Control
  git: 'Git.svg',
  github: 'GitHub.svg',
  bitbucket: 'BitBucket.svg',

  // IDEs
  vscode: 'Visual-Studio-Code-(VS-Code).svg',
  intellij: 'IntelliJ-IDEA.svg',
  pycharm: 'PyCharm.svg',
  webstorm: 'WebStorm.svg',

  // ORM / Data
  mongoose: 'Mongoose.js.svg',
  sequelize: 'Sequelize.svg',
  hibernate: 'Hibernate.svg',
  prisma: 'Node.js.svg',
  sqlalchemy: 'SQLAlchemy.svg',

  // Other notable
  stripe: 'Salesforce.svg',
  twilio: 'Node.js.svg',
  sendgrid: 'Node.js.svg',
  'socket.io': 'Socket.io.svg',
  socketio: 'Socket.io.svg',
  webassembly: 'WebAssembly.svg',
  wasm: 'WebAssembly.svg',
  tensorflow: 'TensorFlow.svg',
  pytorch: 'PyTorch.svg',
  pandas: 'Pandas.svg',
  numpy: 'NumPy.svg',
  jupyter: 'Jupyter.svg',
  linux: 'Linux.svg',
  ubuntu: 'Ubuntu.svg',
  android: 'Android.svg',
  ios: 'Apple.svg',
  apple: 'Apple.svg',
  figma: 'Figma.svg',
  postman: 'Postman.svg',
  insomnia: 'Insomnia.svg',
  json: 'JSON.svg',
  yaml: 'YAML.svg',
  xml: 'XML.svg',
  markdown: 'Markdown.svg',
  eslint: 'ESLint.svg',
  'd3.js': 'D3.js.svg',
  d3: 'D3.js.svg',
  'three.js': 'Three.js.svg',
  threejs: 'Three.js.svg',
  ionic: 'Ionic.svg',
  capacitor: 'Capacitor.svg',
  jira: 'Jira.svg',
  confluence: 'Confluence.svg',
  slack: 'Slack.svg',
  tomcat: 'Apache-Tomcat.svg',
  'apache tomcat': 'Apache-Tomcat.svg',
  spark: 'Apache-Spark.svg',
  'apache spark': 'Apache-Spark.svg',
  hadoop: 'Apache-Hadoop.svg',
  airflow: 'Apache-Airflow.svg',
  appwrite: 'Appwrite.svg',
  sanity: 'Sanity.svg',
  wordpress: 'WordPress.svg',
  drupal: 'Drupal.svg',
  woocommerce: 'WooCommerce.svg',
  shopware: 'Shopware.svg',
  streamlit: 'Streamlit.svg',
  matplotlib: 'Matplotlib.svg',
};

/**
 * Resolve a technology string to an SVG filename.
 * Tries exact match first, then splits on common delimiters and matches tokens.
 * Returns the first matching filename or null.
 */
export function resolveTechIcon(technology: string): string | null {
  if (!technology) return null;

  const normalized = technology.toLowerCase().trim();

  // Exact match
  if (ICON_MAP[normalized]) return ICON_MAP[normalized];

  // Split on common delimiters and try each token
  const tokens = normalized.split(/[,\/\-\s]+/).filter(Boolean);
  for (const token of tokens) {
    if (ICON_MAP[token]) return ICON_MAP[token];
  }

  // Try two-word combinations (e.g., "apache kafka")
  for (let i = 0; i < tokens.length - 1; i++) {
    const pair = `${tokens[i]} ${tokens[i + 1]}`;
    if (ICON_MAP[pair]) return ICON_MAP[pair];
  }

  return null;
}

/**
 * Resolve all icons for a technology string.
 * Returns an array of matching SVG filenames (deduped).
 */
export function resolveAllTechIcons(technology: string): string[] {
  if (!technology) return [];

  const results: string[] = [];
  const seen = new Set<string>();

  const parts = technology.split(/,\s*/);
  for (const part of parts) {
    const icon = resolveTechIcon(part.trim());
    if (icon && !seen.has(icon)) {
      seen.add(icon);
      results.push(icon);
    }
  }

  return results;
}
