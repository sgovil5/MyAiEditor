// Sample JavaScript file for testing MyAiEditor
// This is a simple calculator application

class Calculator {
    constructor() {
        this.result = 0;
    }

    add(a, b) {
        this.result = a + b;
        return this.result;
    }

    subtract(a, b) {
        this.result = a - b;
        return this.result;
    }

    multiply(a, b) {
        this.result = a * b;
        return this.result;
    }

    divide(a, b) {
        if (b === 0) {
            throw new Error('Cannot divide by zero');
        }
        this.result = a / b;
        return this.result;
    }

    clear() {
        this.result = 0;
        return this.result;
    }
}

// Example usage
const calc = new Calculator();
console.log('5 + 3 =', calc.add(5, 3));
console.log('10 - 4 =', calc.subtract(10, 4));
console.log('6 * 7 =', calc.multiply(6, 7));
console.log('20 / 4 =', calc.divide(20, 4));

// Export for use in other modules
module.exports = Calculator;