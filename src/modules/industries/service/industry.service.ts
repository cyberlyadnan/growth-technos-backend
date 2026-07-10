import { IIndustry, Industry } from '../model/industry.model';
import { TaxonomyRepository } from '@modules/shared/taxonomy/taxonomy.repository';
import { CreateTaxonomyDto, TaxonomyService, UpdateTaxonomyDto } from '@modules/shared/taxonomy/taxonomy.service';

interface IndustryDto extends CreateTaxonomyDto {
  icon?: string;
}

const industryRepository = new TaxonomyRepository<IIndustry>(Industry);

export const industryService = new TaxonomyService<IIndustry>(
  industryRepository,
  'Industry',
  ['name', 'slug', 'description'],
  (dto: CreateTaxonomyDto | UpdateTaxonomyDto) => {
    const data = dto as IndustryDto;
    return {
      ...(data.icon !== undefined && { icon: data.icon || undefined }),
    };
  },
);
