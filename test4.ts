async function test() {
  const res = await fetch("http://localhost:3000/api/stock/2330.TW?interval=60m");
  const data = await res.json();
  console.log(data.historical[0]);
}
test();
