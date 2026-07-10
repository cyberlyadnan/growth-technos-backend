import { createTaxonomyRoutes } from '@modules/shared/taxonomy/taxonomy.routes';
import { topicClusterService } from '../service/topic-cluster.service';

export default createTaxonomyRoutes(topicClusterService as never);
