/**
 * 引导系统
 */
class GuideManager {
    constructor() {
        this.overlay = document.getElementById('guide-overlay');
        this.state = Storage.getGuideState();
        this.currentStep = this.state.currentStep;
        this.manualOnly = false;
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

        // 自动弹出只依据本地存储中的完成记录
        if (!this.state.completed) {
            this.show({ manual: false });
        }

        // 帮助入口仅用于查看引导，不重置、不回写引导状态
        window.addEventListener('showGuide', () => {
            this.show({ manual: true });
        });
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        document.getElementById('btn-start-guide').addEventListener('click', () => {
            this.nextStep();
        });

        document.getElementById('btn-skip-guide').addEventListener('click', () => {
            if (this.manualOnly) {
                this.hide();
            } else {
                this.complete();
            }
        });

        document.getElementById('btn-step-1-next').addEventListener('click', () => {
            this.nextStep();
        });

        document.getElementById('btn-step-2-next').addEventListener('click', () => {
            this.nextStep();
        });

        document.getElementById('btn-finish-guide').addEventListener('click', () => {
            if (this.manualOnly) {
                this.hide();
            } else {
                this.complete();
            }
        });

        document.getElementById('btn-close-guide').addEventListener('click', () => {
            this.hide();
        });

        this.overlay.addEventListener('click', (event) => {
            if (event.target === this.overlay) {
                this.hide();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !this.overlay.classList.contains('hidden')) {
                this.hide();
            }
        });

        document.getElementById('btn-reset-guide').addEventListener('click', () => {
            this.resetGuide();
        });

        document.getElementById('btn-copy-recovery-link').addEventListener('click', () => {
            this.copyRecoveryLink();
        });
    }

    /**
     * 显示引导
     */
    show({ manual = false } = {}) {
        this.state = Storage.getGuideState();
        this.manualOnly = manual;
        this.currentStep = this.manualOnly || this.state.completed ? 0 : this.state.currentStep;
        this.showStep(this.currentStep);
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
        this.steps.forEach(stepId => {
            document.getElementById(stepId).classList.add('hidden');
        });

        if (index < this.steps.length) {
            this.currentStep = index;
            document.getElementById(this.steps[index]).classList.remove('hidden');
            this.updateActionText();
        }
    }

    /**
     * 更新查看模式下的按钮和存储状态说明
     */
    updateActionText() {
        const viewNote = document.getElementById('guide-view-note');
        const skipButton = document.getElementById('btn-skip-guide');
        const finishButton = document.getElementById('btn-finish-guide');
        const storageStatus = document.getElementById('guide-storage-status');

        viewNote.classList.toggle('hidden', !this.manualOnly);
        skipButton.textContent = this.manualOnly ? '关闭' : '跳过引导';
        finishButton.textContent = this.manualOnly ? '关闭引导' : '完成引导';

        if (this.state.completed) {
            storageStatus.textContent = '已完成：主动查看引导不会改变此状态';
        } else {
            storageStatus.textContent = '未完成：当前步骤已保存，下次打开可继续';
        }
    }

    /**
     * 下一步
     */
    nextStep() {
        this.currentStep++;

        if (this.currentStep < this.steps.length) {
            // 主动从帮助入口查看时，只浏览，不回写任何引导记录
            if (!this.manualOnly) {
                this.state = Storage.saveGuideProgress(this.currentStep);
            }
            this.showStep(this.currentStep);
        } else if (!this.manualOnly) {
            this.complete();
        } else {
            this.hide();
        }
    }

    /**
     * 完成引导
     */
    complete() {
        this.state = Storage.setGuideCompleted();
        this.hide();
        Utils.showToast('开始你的光学探索之旅吧！', 'success');
    }

    /**
     * 明确重置引导状态
     */
    resetGuide() {
        const confirmed = window.confirm(
            '重置后会清除本地存储里的引导完成记录和当前步骤，下次打开页面会重新弹出引导。确定要重置吗？'
        );

        if (!confirmed) {
            return;
        }

        this.state = Storage.resetGuide();
        this.currentStep = 0;
        this.manualOnly = false;
        this.showStep(0);
        this.hide();
        Utils.showToast('引导已重置，下次打开页面将重新显示', 'info');
    }

    /**
     * 复制用于换设备或清理站点数据后的恢复链接
     */
    async copyRecoveryLink() {
        const recoveryUrl = Storage.createGuideRecoveryUrl();

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(recoveryUrl);
            } else {
                if (window.prompt('请手动复制恢复链接：', recoveryUrl) === null) {
                    return;
                }
            }
            Utils.showToast('恢复链接已复制，请在新设备或新浏览器中打开', 'success');
        } catch (e) {
            if (window.prompt('复制失败，请手动复制恢复链接：', recoveryUrl) === null) {
                return;
            }
            Utils.showToast('恢复链接已复制，请在新设备或新浏览器中打开', 'success');
        }
    }
}
