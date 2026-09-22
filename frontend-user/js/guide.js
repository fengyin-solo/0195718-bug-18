/**
 * 引导系统
 */
class GuideManager {
    constructor() {
        this.overlay = document.getElementById('guide-overlay');
        this.note = document.getElementById('guide-note');
        this.currentStep = 0;
        // 温习模式：主动打开帮助时只展示引导，不改动完成状态
        this.manualMode = false;
        this.steps = [
            'guide-welcome',
            'guide-step-1',
            'guide-step-2',
            'guide-step-3'
        ];

        this.init();
    }

    /**
     * 初始化
     */
    init() {
        this.bindEvents();

        // 检查是否需要显示引导（以存储中的完成记录为准）
        if (!Storage.isGuideCompleted()) {
            // 未完成时恢复到上次进行到的步骤
            this.show({ startStep: Storage.getGuideStep() });
        }

        // 监听显示引导事件（来自帮助入口，只展示、不改状态）
        window.addEventListener('showGuide', () => {
            this.show({ manual: true });
        });
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 开始引导
        document.getElementById('btn-start-guide').addEventListener('click', () => {
            this.nextStep();
        });

        // 跳过引导
        document.getElementById('btn-skip-guide').addEventListener('click', () => {
            this.complete();
        });

        // 重置引导状态
        document.getElementById('btn-reset-guide').addEventListener('click', () => {
            Storage.resetGuide();
            this.currentStep = 0;
            this.showStep(0);
            Utils.showToast('引导状态已重置，下次打开页面将重新显示引导', 'info');
        });

        // 步骤导航
        document.getElementById('btn-step-1-next').addEventListener('click', () => {
            this.nextStep();
        });

        document.getElementById('btn-step-2-next').addEventListener('click', () => {
            this.nextStep();
        });

        document.getElementById('btn-finish-guide').addEventListener('click', () => {
            this.complete();
        });
    }

    /**
     * 显示引导
     * @param {Object} options manual: 温习模式（只展示，不改动完成状态）；startStep: 起始步骤
     */
    show({ manual = false, startStep = 0 } = {}) {
        this.manualMode = manual;
        this.currentStep = startStep;
        this.showStep(startStep);
        // 温习模式下提示本次查看不会改变完成记录
        this.note.classList.toggle('hidden', !manual);
        this.overlay.classList.remove('hidden');
    }

    /**
     * 隐藏引导
     */
    hide() {
        this.overlay.classList.add('hidden');
    }

    /**
     * 显示指定步骤
     */
    showStep(index) {
        // 隐藏所有步骤
        this.steps.forEach(stepId => {
            document.getElementById(stepId).classList.add('hidden');
        });

        // 显示当前步骤
        if (index < this.steps.length) {
            document.getElementById(this.steps[index]).classList.remove('hidden');
        }
    }

    /**
     * 下一步
     */
    nextStep() {
        this.currentStep++;
        if (this.currentStep < this.steps.length) {
            this.showStep(this.currentStep);
            // 记录进度，重新打开时可恢复到这一步
            if (!this.manualMode) {
                Storage.setGuideStep(this.currentStep);
            }
        } else {
            this.complete();
        }
    }

    /**
     * 完成引导
     */
    complete() {
        if (this.manualMode) {
            // 温习模式：只关闭，不改动完成状态
            this.hide();
            return;
        }
        Storage.setGuideCompleted();
        this.hide();
        Utils.showToast('开始你的光学探索之旅吧！', 'success');
    }
}
