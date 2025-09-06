export function setupCounter(element) {
  let counter = 0
  const setCounter = (count) => {
    counter = count
    // ★★★ セキュリティ強化: textContent で XSS 防止 ★★★
    element.textContent = `count is ${counter}`
  }
  element.addEventListener('click', () => setCounter(counter + 1))
  setCounter(0)
}
