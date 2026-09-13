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

<section>
  <h2>Bad Dad Jokes</h2>
  <ul>
    <li>Why did the scarecrow win an award? Because he was outstanding in his field.</li>
    <li>What do you call a fake noodle? An impasta.</li>
    <li>I'm reading a book on anti-gravity. It's impossible to put down.</li>
    <li>Why don't scientists trust atoms? Because they make up everything.</li>
  </ul>
</section>

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
