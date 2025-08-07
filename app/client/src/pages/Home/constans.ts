
export const TemplateTagThemes = [ 'green', 'blue', 'yellow' ];

export enum TemplateColors {
    DARK_GREEN = '#0a5f0a',
    LIGHT_GREEN = '#e5ffe5',
    BORDER_GREEN = '#acfbac',
    DARK_BLUE = '#004379',
    LIGHT_BLUE = '#edf7ff',
    BORDER_BLUE = '#90ceff',
    LIGHT_YELLOW = '#fff4cd',
    DARK_YELLOW = '#6e5600',
    BORDER_YELLOW = '#fce079'
}

export const getTemplateTagColors = (theme: string) => {
    switch (theme) {
        case 'green':
            return {
                color: TemplateColors.DARK_GREEN,
                backgroundColor: TemplateColors.LIGHT_GREEN,
                borderColor: TemplateColors.BORDER_GREEN
            };
        case 'blue':
            return {
                color: TemplateColors.DARK_BLUE,
                backgroundColor: TemplateColors.LIGHT_BLUE,
                borderColor: TemplateColors.BORDER_BLUE
            };
        case 'yellow':
            return {
                color: TemplateColors.DARK_YELLOW,
                backgroundColor: TemplateColors.LIGHT_YELLOW,
                borderColor: TemplateColors.BORDER_YELLOW
            };
        default:
            return {
                color: TemplateColors.DARK_GREEN,
                backgroundColor: TemplateColors.LIGHT_GREEN,
                borderColor: TemplateColors.BORDER_GREEN
            };
    }
};