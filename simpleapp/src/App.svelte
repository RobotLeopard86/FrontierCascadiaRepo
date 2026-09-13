<script>
  import Counter from './lib/Counter.svelte';
</script>

<main>
  <Counter />

  <section class="jokes">
    <h2>Terrible Dad Jokes</h2>
    <ul>
      <li>I'm afraid for the calendar. Its days are numbered.</li>
      <li>My wife said I should do some gardening. I said, 'I'm already rooting for the plants!'</li>
      <li>What do you call a fake noodle? An Impasta!</li>
      <li>Why don't scientists trust atoms? Because they make up everything!</li>
      <li>I told my wife she was drawing her eyebrows too high. She looked surprised.</li>
    </ul>
  </section>
</main>

<style>
  main {
    text-align: center;
    padding: 2em;
    font-family: sans-serif;
  }

  .jokes {
    margin-top: 3em;
    padding: 1em;
    border: 2px dashed #ccc;
    border-radius: 8px;
    background-color: #f9f9f9;
  }

  .jokes h2 {
    color: #333;
    margin-bottom: 1em;
  }

  .jokes ul {
    list-style: none;
    padding: 0;
  }

  .jokes li {
    margin: 0.5em 0;
    font-style: italic;
    color: #666;
  }
</style>
