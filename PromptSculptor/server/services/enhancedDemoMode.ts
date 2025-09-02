import { type GeneratePromptRequest } from "../../shared/schema.js";

/**
 * Enhanced Demo Mode Service
 * 
 * Provides high-quality, contextually-aware demo prompts that showcase
 * the platform's capabilities while encouraging users to add their own API keys.
 * 
 * Features:
 * - Context-aware template generation
 * - User guidance and call-to-actions
 * - Support for all complexity levels and options
 * - Realistic examples that demonstrate value
 */

export interface DemoPromptOptions {
  isAuthenticated: boolean;
  availableServices: string[];
  targetModel: string;
  message?: string;
}

export interface EnhancedGeneratedPromptResult {
  generatedPrompt: string;
  wordCount: number;
  title: string;
  isDemoMode: boolean;
  demoMessage?: string;
  callToAction?: string;
}

export class EnhancedDemoMode {
  
  /**
   * Generate enhanced demo prompt with user context
   */
  static generateEnhancedDemoPrompt(
    request: GeneratePromptRequest, 
    options: DemoPromptOptions
  ): EnhancedGeneratedPromptResult {
    
    const prompt = this.generateContextualPrompt(request);
    const wordCount = prompt.split(/\s+/).length;
    const { demoMessage, callToAction } = this.generateUserGuidance(options);
    
    return {
      generatedPrompt: prompt,
      title: this.generateTitle(request),
      wordCount,
      isDemoMode: true,
      demoMessage,
      callToAction
    };
  }

  /**
   * Generate contextual prompt based on user input and template type
   */
  private static generateContextualPrompt(request: GeneratePromptRequest): string {
    const templates = {
      analysis: this.generateAnalysisPrompt(request),
      writing: this.generateWritingPrompt(request),
      coding: this.generateCodingPrompt(request),
      custom: this.generateCustomPrompt(request)
    };

    return templates[request.templateType as keyof typeof templates] || templates.custom;
  }

  /**
   * Generate analysis-focused prompt
   */
  private static generateAnalysisPrompt(request: GeneratePromptRequest): string {
    const contextKeywords = this.extractKeywords(request.naturalLanguageInput);
    const isBusinessFocused = this.isBusinessContext(request.naturalLanguageInput);
    
    return `# ${isBusinessFocused ? 'Business Intelligence' : 'Data Analysis'} Expert

## Role
You are a senior ${isBusinessFocused ? 'business analyst' : 'data scientist'} with expertise in ${contextKeywords.join(', ')} analysis and actionable insights generation.

${request.useXMLTags ? '<context>' : '## Context'}
${request.naturalLanguageInput}
${request.useXMLTags ? '</context>' : ''}

${request.useXMLTags ? '<requirements>' : '## Requirements'}
- Identify key patterns and trends in the ${this.getPrimaryDataType(request.naturalLanguageInput)}
- Provide specific, quantifiable insights
- Generate actionable recommendations with clear next steps
- Use appropriate analytical frameworks and methodologies
- Focus on business impact and ROI where applicable
${request.useXMLTags ? '</requirements>' : ''}

${request.includeExamples ? `${request.useXMLTags ? '<example>' : '## Example Analysis Structure'}
**Key Finding 1: [Primary Insight]**
- Evidence: [Supporting data points]
- Impact: [Business/operational significance]
- Confidence Level: [High/Medium/Low with reasoning]

**Key Finding 2: [Secondary Insight]**
- Evidence: [Supporting data points]  
- Impact: [Business/operational significance]
- Recommended Action: [Specific next steps]

**Summary Metrics:**
- Sample size: [Data volume analyzed]
- Time period: [Analysis timeframe]
- Statistical significance: [Confidence intervals/p-values]
${request.useXMLTags ? '</example>' : ''}` : ''}

${request.includeConstraints ? `${request.useXMLTags ? '<constraints>' : '## Constraints'}
- Base conclusions only on provided data
- Maintain data privacy and confidentiality standards
- Use appropriate statistical methods for the data type
- Provide uncertainty estimates where applicable
- Flag any data quality issues or limitations
${request.useXMLTags ? '</constraints>' : ''}` : ''}

${request.useXMLTags ? '<output_format>' : '## Output Format'}
Deliver your analysis in this structure:
1. **Executive Summary** (2-3 key takeaways)
2. **Detailed Findings** (with supporting evidence)
3. **Statistical Analysis** (confidence levels, significance tests)
4. **Business Recommendations** (prioritized action items)
5. **Next Steps** (implementation roadmap)
6. **Appendix** (methodology notes, assumptions)
${request.useXMLTags ? '</output_format>' : ''}`;
  }

  /**
   * Generate writing-focused prompt
   */
  private static generateWritingPrompt(request: GeneratePromptRequest): string {
    const contentType = this.getContentType(request.naturalLanguageInput);
    const audience = this.getAudience(request.naturalLanguageInput);
    const tone = this.getTone(request.naturalLanguageInput);
    
    return `# Professional ${contentType} Writer

## Role
You are an expert content strategist and writer specializing in ${contentType} for ${audience} audiences, with a focus on ${tone} communication.

${request.useXMLTags ? '<context>' : '## Context'}
${request.naturalLanguageInput}
${request.useXMLTags ? '</context>' : ''}

${request.useXMLTags ? '<requirements>' : '## Requirements'}
- Write in a ${tone} tone that resonates with ${audience}
- Structure content for optimal readability and engagement
- Include compelling hooks and clear value propositions
- Incorporate relevant examples and case studies
- Optimize for ${this.getSEOContext(request.naturalLanguageInput)}
- Ensure content is actionable and practical
${request.useXMLTags ? '</requirements>' : ''}

${request.includeExamples ? `${request.useXMLTags ? '<example>' : '## Content Structure Example'}
**Opening Hook:**
- Start with a compelling statistic, question, or story
- Connect to reader's pain point or aspiration

**Body Structure:**
- **Section 1:** Problem identification and context
- **Section 2:** Solution framework with examples
- **Section 3:** Implementation steps and best practices
- **Section 4:** Common pitfalls and how to avoid them

**Conclusion:**
- Summarize key takeaways
- Provide clear next steps
- Include compelling call-to-action
${request.useXMLTags ? '</example>' : ''}` : ''}

${request.includeConstraints ? `${request.useXMLTags ? '<constraints>' : '## Constraints'}
- Maintain ${tone} tone throughout
- Target reading level: ${this.getReadingLevel(audience)}
- Word count: ${this.getTargetWordCount(contentType)} words
- Include 2-3 relevant examples or case studies
- Ensure all claims are supportable with evidence
${request.useXMLTags ? '</constraints>' : ''}` : ''}

${request.useXMLTags ? '<output_format>' : '## Output Format'}
Structure your ${contentType} as follows:
1. **Compelling Headline** (8-12 words, benefit-focused)
2. **Introduction** (hook + problem + solution preview)
3. **Main Content** (3-5 sections with clear subheadings)
4. **Practical Examples** (real-world applications)
5. **Conclusion** (key takeaways + next steps)
6. **Call-to-Action** (specific, measurable action)
${request.useXMLTags ? '</output_format>' : ''}`;
  }

  /**
   * Generate coding-focused prompt
   */
  private static generateCodingPrompt(request: GeneratePromptRequest): string {
    const language = this.extractProgrammingLanguage(request.naturalLanguageInput);
    const domain = this.extractDomain(request.naturalLanguageInput);
    
    return `# Senior ${language} Developer & Code Reviewer

## Role
You are a senior software engineer with expertise in ${language} development, specializing in ${domain} applications and best practices.

${request.useXMLTags ? '<context>' : '## Context'}
${request.naturalLanguageInput}
${request.useXMLTags ? '</context>' : ''}

${request.useXMLTags ? '<requirements>' : '## Requirements'}
- Follow ${language} best practices and conventions
- Focus on code readability, maintainability, and performance
- Include comprehensive error handling and edge cases
- Provide security considerations where applicable
- Suggest testing strategies and approaches
- Consider scalability and future maintenance
${request.useXMLTags ? '</requirements>' : ''}

${request.includeExamples ? `${request.useXMLTags ? '<example>' : '## Code Review Example'}
**Issue Identified:**
\`\`\`${language.toLowerCase()}
// Inefficient or problematic code pattern
[Example of suboptimal code]
\`\`\`

**Recommended Solution:**
\`\`\`${language.toLowerCase()}
// Improved implementation
[Example of better approach]
\`\`\`

**Explanation:**
- **Why it's better:** [Performance/readability/maintenance benefits]
- **Trade-offs:** [Any considerations or limitations]
- **Testing approach:** [How to verify the improvement]
${request.useXMLTags ? '</example>' : ''}` : ''}

${request.includeConstraints ? `${request.useXMLTags ? '<constraints>' : '## Constraints'}
- Follow ${language} style guide (PEP 8 for Python, etc.)
- Maintain backward compatibility where specified
- Consider memory usage and computational complexity
- Include security best practices
- Provide clear documentation and comments
${request.useXMLTags ? '</constraints>' : ''}` : ''}

${request.useXMLTags ? '<output_format>' : '## Output Format'}
Structure your code review as:
1. **Overview & Assessment** (high-level summary)
2. **Code Quality Analysis** (style, patterns, best practices)
3. **Performance Optimization** (efficiency improvements)
4. **Security Review** (potential vulnerabilities)
5. **Testing Recommendations** (unit/integration test suggestions)
6. **Refactored Code Examples** (improved implementations)
7. **Next Steps** (prioritized action items)
${request.useXMLTags ? '</output_format>' : ''}`;
  }

  /**
   * Generate custom prompt
   */
  private static generateCustomPrompt(request: GeneratePromptRequest): string {
    const domain = this.extractDomain(request.naturalLanguageInput);
    const complexity = this.assessComplexity(request.naturalLanguageInput);
    
    return `# Expert ${domain} Consultant

## Role
You are a seasoned professional with deep expertise in ${domain}, known for providing ${complexity}-level insights and practical solutions.

${request.useXMLTags ? '<context>' : '## Context'}
${request.naturalLanguageInput}
${request.useXMLTags ? '</context>' : ''}

${request.useXMLTags ? '<requirements>' : '## Requirements'}
- Provide comprehensive, actionable guidance
- Use specific examples and real-world applications
- Structure response logically with clear reasoning
- Consider multiple perspectives and approaches
- Include implementation considerations
- Address potential challenges and solutions
${request.useXMLTags ? '</requirements>' : ''}

${request.includeExamples ? `${request.useXMLTags ? '<example>' : '## Response Framework'}
**Approach 1: [Primary Solution]**
- Implementation steps
- Required resources
- Expected outcomes
- Potential risks

**Approach 2: [Alternative Solution]**
- Different methodology
- Comparative advantages
- Use case scenarios
- Success metrics
${request.useXMLTags ? '</example>' : ''}` : ''}

${request.includeConstraints ? `${request.useXMLTags ? '<constraints>' : '## Constraints'}
- Maintain accuracy and factual correctness
- Provide practical, implementable solutions
- Consider resource and time limitations
- Include risk assessment and mitigation strategies
${request.useXMLTags ? '</constraints>' : ''}` : ''}

${request.useXMLTags ? '<output_format>' : '## Output Format'}
Structure your response with:
1. **Situation Analysis** (current state assessment)
2. **Strategic Options** (multiple approaches with pros/cons)
3. **Recommended Approach** (best solution with rationale)
4. **Implementation Plan** (step-by-step execution)
5. **Success Metrics** (how to measure progress)
6. **Risk Mitigation** (potential issues and solutions)
${request.useXMLTags ? '</output_format>' : ''}`;
  }

  /**
   * Generate user guidance based on authentication and available services
   */
  private static generateUserGuidance(options: DemoPromptOptions): { demoMessage: string; callToAction: string } {
    if (!options.isAuthenticated) {
      return {
        demoMessage: "🎯 This is a demo prompt showcasing PromptSculptor's capabilities. Sign up to save your prompts and unlock AI-powered generation!",
        callToAction: "Create free account to add your API keys and generate personalized prompts"
      };
    }

    const modelNames = {
      'gpt': 'OpenAI',
      'claude': 'Anthropic Claude', 
      'gemini': 'Google Gemini'
    };
    
    const modelName = modelNames[options.targetModel as keyof typeof modelNames] || options.targetModel;
    
    if (options.availableServices.length === 0) {
      return {
        demoMessage: `📝 Demo mode: Add your ${modelName} API key to unlock AI-powered prompt generation with personalized results!`,
        callToAction: `Add ${modelName} API key in Settings → API Keys to get started`
      };
    }

    const hasTargetModel = options.availableServices.includes(options.targetModel);
    if (!hasTargetModel) {
      return {
        demoMessage: `🔧 Demo mode: You have ${options.availableServices.join(', ')} configured. Add ${modelName} for this specific model.`,
        callToAction: `Add ${modelName} API key to use this model, or switch to an available model`
      };
    }

    // Fallback case (shouldn't normally reach here in demo mode)
    return {
      demoMessage: "📋 Demo mode: This shows the prompt structure. Your API key would generate personalized content.",
      callToAction: "Switch to AI generation for personalized results"
    };
  }

  /**
   * Generate appropriate title for the prompt
   */
  private static generateTitle(request: GeneratePromptRequest): string {
    const templateTitles = {
      analysis: "Data Analysis Expert Prompt",
      writing: "Content Writing Specialist Prompt", 
      coding: "Code Review Expert Prompt",
      custom: "Professional Consultant Prompt"
    };
    
    return templateTitles[request.templateType as keyof typeof templateTitles] || "Expert Assistant Prompt";
  }

  // Helper methods for contextual analysis
  
  private static extractKeywords(input: string): string[] {
    const commonKeywords = [
      'customer feedback', 'user behavior', 'sales data', 'performance metrics',
      'market research', 'survey results', 'analytics', 'trends', 'insights'
    ];
    
    return commonKeywords.filter(keyword => 
      input.toLowerCase().includes(keyword.toLowerCase())
    ).slice(0, 3);
  }

  private static isBusinessContext(input: string): boolean {
    const businessTerms = ['revenue', 'sales', 'customers', 'market', 'business', 'strategy', 'ROI', 'KPI'];
    return businessTerms.some(term => input.toLowerCase().includes(term.toLowerCase()));
  }

  private static getPrimaryDataType(input: string): string {
    if (input.toLowerCase().includes('survey')) return 'survey responses';
    if (input.toLowerCase().includes('feedback')) return 'customer feedback';
    if (input.toLowerCase().includes('sales')) return 'sales data';
    if (input.toLowerCase().includes('user') || input.toLowerCase().includes('behavior')) return 'user behavior data';
    return 'dataset';
  }

  private static getContentType(input: string): string {
    if (input.toLowerCase().includes('blog')) return 'Blog Post';
    if (input.toLowerCase().includes('article')) return 'Article';
    if (input.toLowerCase().includes('email')) return 'Email';
    if (input.toLowerCase().includes('social')) return 'Social Media Content';
    if (input.toLowerCase().includes('newsletter')) return 'Newsletter';
    return 'Content';
  }

  private static getAudience(input: string): string {
    if (input.toLowerCase().includes('business') || input.toLowerCase().includes('professional')) return 'business professionals';
    if (input.toLowerCase().includes('developer') || input.toLowerCase().includes('technical')) return 'developers';
    if (input.toLowerCase().includes('consumer') || input.toLowerCase().includes('customer')) return 'consumers';
    return 'general audience';
  }

  private static getTone(input: string): string {
    if (input.toLowerCase().includes('formal') || input.toLowerCase().includes('professional')) return 'professional';
    if (input.toLowerCase().includes('casual') || input.toLowerCase().includes('friendly')) return 'conversational';
    if (input.toLowerCase().includes('technical')) return 'technical';
    return 'informative';
  }

  private static getSEOContext(input: string): string {
    if (input.toLowerCase().includes('seo') || input.toLowerCase().includes('search')) return 'search engine optimization';
    return 'user engagement';
  }

  private static getReadingLevel(audience: string): string {
    if (audience.includes('developers') || audience.includes('technical')) return 'Advanced';
    if (audience.includes('business')) return 'Professional';
    return 'General (8th grade)';
  }

  private static getTargetWordCount(contentType: string): string {
    if (contentType.includes('Blog')) return '1000-2000';
    if (contentType.includes('Article')) return '800-1500';
    if (contentType.includes('Email')) return '200-500';
    return '500-1000';
  }

  private static extractProgrammingLanguage(input: string): string {
    const languages = ['Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C#', 'Go', 'Rust', 'PHP'];
    const found = languages.find(lang => 
      input.toLowerCase().includes(lang.toLowerCase())
    );
    return found || 'Python';
  }

  private static extractDomain(input: string): string {
    if (input.toLowerCase().includes('web') || input.toLowerCase().includes('frontend') || input.toLowerCase().includes('react')) return 'web development';
    if (input.toLowerCase().includes('api') || input.toLowerCase().includes('backend') || input.toLowerCase().includes('server')) return 'backend development';
    if (input.toLowerCase().includes('data') || input.toLowerCase().includes('analytics')) return 'data science';
    if (input.toLowerCase().includes('mobile') || input.toLowerCase().includes('ios') || input.toLowerCase().includes('android')) return 'mobile development';
    if (input.toLowerCase().includes('ai') || input.toLowerCase().includes('ml') || input.toLowerCase().includes('machine learning')) return 'AI/ML';
    return 'software development';
  }

  private static assessComplexity(input: string): string {
    if (input.length > 200) return 'advanced';
    if (input.length > 100) return 'intermediate';
    return 'foundational';
  }
}