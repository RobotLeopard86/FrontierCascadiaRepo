<script>
  import Counter from './lib/Counter.svelte';
  let name = 'World';
</script>

<main>
  <h1>Hello {name}!</h1>
  <p>Welcome to your clean Svelte page.</p>
  <Counter />
  <Counter />
  <Counter />
</main>


<style>
  main {
    text-align: center;
    padding: 2em;
    font-family: sans-serif;
  }
  h1 {
    color: #ff3e00;
  }
</style>
