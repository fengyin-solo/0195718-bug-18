/**
 * 本地存储管理
 * 引导状态以存储记录为唯一依据：{ completed: boolean, step: number, updatedAt: number }
 * 记录一旦写入会一直保留，只有主动重置或用户清除浏览器数据才会消失
 */
const Storage = {
    GUIDE_KEY: 'optics_guide_completed',

    /**
     * 读取引导状态记录（兼容旧版本写入的 'true' 字符串）
     */
    getGuideState() {
        try {
            const raw = localStorage.getItem(this.GUIDE_KEY);
            if (raw === null) {
                return { completed: false, step: 0 };
            }
            // 兼容旧版本写入的 'true'
            if (raw === 'true') {
                return { completed: true, step: 0 };
            }
            const state = JSON.parse(raw);
            return {
                completed: state.completed === true,
                step: Number.isInteger(state.step) && state.step > 0 ? state.step : 0
            };
        } catch (e) {
            // 记录损坏或存储不可用时视为未完成
            return { completed: false, step: 0 };
        }
    },

    /**
     * 保存引导状态记录
     */
    saveGuideState(state) {
        try {
            localStorage.setItem(this.GUIDE_KEY, JSON.stringify({
                completed: state.completed === true,
                step: Number.isInteger(state.step) && state.step > 0 ? state.step : 0,
                updatedAt: Date.now()
            }));
        } catch (e) {
            // 忽略存储错误
        }
    },

    /**
     * 检查引导是否完成（以存储记录为准）
     */
    isGuideCompleted() {
        return this.getGuideState().completed;
    },

    /**
     * 获取引导进行到的步骤（用于恢复到上次那一步）
     */
    getGuideStep() {
        return this.getGuideState().step;
    },

    /**
     * 记录引导进行到的步骤（不影响完成状态）
     */
    setGuideStep(step) {
        const state = this.getGuideState();
        state.step = step;
        this.saveGuideState(state);
    },

    /**
     * 标记引导完成（记录会一直保留，直到主动重置）
     */
    setGuideCompleted() {
        this.saveGuideState({ completed: true, step: 0 });
    },

    /**
     * 重置引导状态（下次打开页面将重新显示引导）
     */
    resetGuide() {
        try {
            localStorage.removeItem(this.GUIDE_KEY);
        } catch (e) {
            // 忽略存储错误
        }
    }
};
