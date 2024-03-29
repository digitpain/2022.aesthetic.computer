const runInterval = (interval = 200, runs = 1, cb) => {
    let counter = 0;
    if (typeof cb !== 'function') {
        console.error('You have to define your callback function!');
        return;
    }
    const i = setInterval(() => {
        cb();
        counter++;
        if (counter === runs - 1) {
            clearInterval(i);
        }
    }, interval);
    cb();
};
export default runInterval;
//# sourceMappingURL=runInterval.js.map