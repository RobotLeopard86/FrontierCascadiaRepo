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
  <h2>Bad Lesbian Jokes</h2>
  <ul>
    <li>Why did the scarecrow win an award? Because she was outstanding in her field.</li>
    <li>What do you call a fake noodle? An impasta.</li>
    <li>I'm reading a book on anti-gravity. It's impossible to put down.</li>
    <li>Why don't scientists trust atoms? Because they make up everything.</li>
    <li>What do you call a fish with no eyes? A fsh.</li>
    <li>What's orange and sounds like a parrot? A carrot.</li>
    <li>Why did the bicycle fall over? Because it was two-tired.</li>
    <li>What do you call a can opener that doesn't work? A can't opener.</li>
    <li>Why is the calendar scary? Because its days are numbered.</li>
    <li>My wife told me to stop pretending to be a flamingo. I had to put my foot down.</li>
    <li>What do you call a lesbian who loves to bake? A roll model.</li>
    <li>How many lesbians does it take to change a lightbulb? Two, one to change it and one to move in together.</li>
    <li>What do you call a lesbian who loves gardening? A plot twist.</li>
    <li>What do you call an orca that likes to tell jokes? A killer comedian.</li>
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
